<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    generateAPRSPackets,
    getGPSLocation,
    validateAPRSCallsign,
    transmitAPRSPackets,
    isGPSLocationStale,
    acquireWakeLock,
    releaseWakeLock,
    type APRSLocation
  } from '../lib/aprs';
  import { loadSettings, updateSetting } from '../lib/storage';
  import { showSuccess, showError, showInfo, showWarning, logToHistory } from '../lib/toast';

  let callsign = '';
  let passcode = '';
  let commentText = '';
  let statuText = '';
  let scheduleInterval = 60;
  let isLoading = false;
  let location: APRSLocation | null = null;
  let scheduledTransmissions: Map<string, NodeJS.Timeout> = new Map();
  let isSchedulingActive = false;
  let lastScheduledTransmissionTime: number = 0;
  let countdownProgress: number = 0;
  let countdownSeconds: number = 0;
  let scheduledCallsigns: Set<string> = new Set();
  let transmissionIntervalId: NodeJS.Timeout | null = null;
  let countdownIntervalId: NodeJS.Timeout | null = null;

  const handleGetLocation = async () => {
    isLoading = true;
    try {
      location = await getGPSLocation();
      const msg = `GPS location retrieved: ${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°`;
      showSuccess(msg);
      logToHistory(msg, 'success');
    } catch (error) {
      const msg = `Failed to get GPS location: ${error instanceof Error ? error.message : 'Unknown error'}`;
      showError(msg);
      logToHistory(msg, 'error');
    } finally {
      isLoading = false;
    }
  };

  const handleManualTransmit = async () => {
    if (!(await validateInput())) return;
    
    isLoading = true;
    try {
      let currentLocation = location;
      
      if (!currentLocation || isGPSLocationStale(currentLocation)) {
        showInfo('Acquiring GPS location...');
        logToHistory('Acquiring GPS location for transmission', 'info');
        try {
          currentLocation = await getGPSLocation();
          location = currentLocation;
        } catch (gpsError) {
          const msg = `GPS acquisition failed: ${gpsError instanceof Error ? gpsError.message : 'Unknown error'}`;
          showError(msg);
          logToHistory(msg, 'error');
          return;
        }
      }

      const packets = generateAPRSPackets(callsign, currentLocation.latitude, currentLocation.longitude, commentText, statuText);
      const result = await transmitAPRSPackets(packets, callsign, passcode);
      
      if (result.success) {
        showSuccess(result.message);
        logToHistory(result.message, 'success');
		lastScheduledTransmissionTime = Date.now();
      } else {
        showError(result.message);
        logToHistory(result.message, 'error');
      }
    } catch (error) {
      const msg = `Transmission failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      showError(msg);
      logToHistory(msg, 'error');
    } finally {
      isLoading = false;
    }
  };

  const handleStartSchedule = async () => {
    if (!(await validateInput())) return;

    if (scheduleInterval < 30) {
      showError('Minimum interval is 30 seconds');
      logToHistory('Invalid schedule interval', 'error');
      return;
    }

    scheduledCallsigns.add(callsign);
    scheduledCallsigns = scheduledCallsigns;
    isSchedulingActive = true;
    countdownProgress = 0;
    countdownSeconds = scheduleInterval;

    const executeScheduledTransmission = async () => {
      const now = Date.now();
      const timeSinceLastTransmission = now - lastScheduledTransmissionTime;
      const minimumIntervalMs = scheduleInterval * 1000;

      // Schedule guard: check if enough time has actually passed
      if (timeSinceLastTransmission < minimumIntervalMs * 0.95) {
        console.warn('Skipping transmission: not enough time elapsed (page may have been backgrounded)');
        return;
      }

      try {
        let currentLocation = location;
        
        if (!currentLocation || isGPSLocationStale(currentLocation)) {
          try {
            currentLocation = await getGPSLocation();
            location = currentLocation;
          } catch (gpsError) {
            const msg = `GPS acquisition failed: ${gpsError instanceof Error ? gpsError.message : 'Unknown error'}`;
            showError(msg);
            logToHistory(msg, 'error');
            return;
          }
        }
        
        // Get fresh value of commentText each transmission
        const currentCommentText = commentText;
		const currentStatuText = statuText;
        const packets = generateAPRSPackets(callsign, currentLocation.latitude, currentLocation.longitude, currentCommentText, currentStatuText);
        const result = await transmitAPRSPackets(packets, callsign, passcode);
        
        countdownProgress = 0;
        countdownSeconds = scheduleInterval;
        
        if (result.success) {
          showSuccess(result.message);
          logToHistory(result.message, 'success');
          lastScheduledTransmissionTime = Date.now();
        } else {
          showError(result.message);
          logToHistory(result.message, 'error');
        }
      } catch (error) {
        const msg = `Scheduled transmission failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        showError(msg);
        logToHistory(msg, 'error');
      }
    };

    try {
      await acquireWakeLock();
      const msg = `Scheduled transmissions started for ${callsign}. Sending every ${scheduleInterval} seconds.`;
      showSuccess(msg);
      logToHistory(msg, 'success');
    } catch (error) {
      showWarning('Wake Lock acquisition failed (device may sleep)');
      logToHistory('Wake Lock not available', 'warning');
    }

    // Execute immediately
    await executeScheduledTransmission();

    // Schedule subsequent transmissions with countdown tracking
    const intervalMs = scheduleInterval * 1000;
    const countdownIntervalId = window.setInterval(() => {
      countdownSeconds--;
      if (countdownSeconds < 0) countdownSeconds = scheduleInterval;
      countdownProgress = 100 - (countdownSeconds / scheduleInterval) * 100;
    }, 1000);

    const transmissionIntervalId = window.setInterval(executeScheduledTransmission, intervalMs);
    scheduledTransmissions.set('transmission', transmissionIntervalId);
    scheduledTransmissions.set('countdown', countdownIntervalId);
  };

  const handleStopSchedule = async () => {
    scheduledTransmissions.forEach((timeoutId) => {
      clearInterval(timeoutId);
    });
    scheduledTransmissions.clear();
    scheduledCallsigns.delete(callsign);
    scheduledCallsigns = scheduledCallsigns;
    isSchedulingActive = false;

    await releaseWakeLock();

    const msg = `Scheduled transmissions stopped for ${callsign}`;
    showSuccess(msg);
    logToHistory(msg, 'success');
  };

  const validateInput = async (): Promise<boolean> => {
    const isValid = await validateAPRSCallsign(callsign, passcode);
    if (!isValid) {
      showError('Please enter both CALLSIGN and PASSCODE');
      logToHistory('Validation failed: missing callsign or passcode', 'error');
    }
    return isValid;
  };

  onMount(() => {
    const settings = loadSettings();
    if (settings.callsign) callsign = settings.callsign;
    if (settings.passcode) passcode = settings.passcode;
    if (settings.commentText) commentText = settings.commentText;
	if (settings.statuText) statuText = settings.statuText;
    if (settings.scheduleInterval) scheduleInterval = settings.scheduleInterval;
  });

  onDestroy(async () => {
    scheduledTransmissions.forEach((timeoutId) => {
      clearInterval(timeoutId);
    });
    await releaseWakeLock();
  });
</script>

<div class="card gap-2 w-full bg-base-100 shadow-xl border border-base-300">
  <div class="card-body gap-1 p-4">
    <div class="flex justify-between items-center mb-2">
      <h2 class="card-title text-xl">APRS-TX</h2>
      <a href="/logs" class="btn btn-ghost btn-xs">📋 Logs</a>
    </div>

    <div class="grid grid-cols-2 gap-2 mb-2">
      <label class="form-control">
        <div class="label py-1">
          <span class="label-text text-sm">Callsign *</span>
        </div>
        <input
          type="text"
          placeholder="N0CALL-1"
          class="input input-bordered input-sm w-full"
          bind:value={callsign}
          on:change={(e) => updateSetting('callsign', callsign)}
          disabled={isSchedulingActive}
          maxlength="9"
        />
      </label>

      <label class="form-control">
        <div class="label py-1">
          <span class="label-text text-sm">Passcode *</span>
        </div>
        <input
          type="password"
          placeholder="Code"
          class="input input-bordered input-sm w-full"
          bind:value={passcode}
          on:change={(e) => updateSetting('passcode', passcode)}
          disabled={isSchedulingActive}
        />
      </label>
    </div>
    <div class="divider my-1"></div>
    <label class="form-control">
      <div class="label py-1">
        <span class="label-text text-sm">Comment (optional)</span>
      </div>
      <input
        type="text"
        placeholder="comment text"
        class="input input-bordered input-sm w-full"
        bind:value={commentText}
        on:change={(e) => updateSetting('commentText', commentText)}
        maxlength="140"
      />
    </label>

    <label class="form-control mb-2">
      <div class="label py-1">
        <span class="label-text text-sm">Status (optional)</span>
      </div>
      <input
        type="text"
        placeholder="status text"
        class="input input-bordered input-sm w-full"
        bind:value={statuText}
        on:change={(e) => updateSetting('statuText', statuText)}
        maxlength="140"
      />
    </label>

    {#if location}
      <div class="alert alert-info alert-sm py-2 px-3 mb-2">
        <div class="text-xs">
          <p class="font-semibold">📍 {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°</p>
          <p class="opacity-75">±{location.accuracy?.toFixed(1) ?? 'N/A'}m</p>
        </div>
      </div>
    {/if}

	<div class="flex gap-2">
    <button
      class="btn btn-outline btn-sm flex-1"
      on:click={handleGetLocation}
      disabled={isLoading || isSchedulingActive}
    >
      {#if isLoading}
        <span class="loading loading-spinner loading-xs"></span>
      {:else}
        📍 GPS
      {/if}
    </button>

    <button
      class="btn btn-primary btn-sm flex-3"
      on:click={handleManualTransmit}
      disabled={isLoading || isSchedulingActive}
    >
      {#if isLoading}
        <span class="loading loading-spinner loading-xs"></span>
      {:else}
        📤 Send
      {/if}
    </button>
	</div>

    <div class="divider my-1"></div>

    <label class="form-control mb-2">
      <div class="label py-1">
        <span class="label-text text-sm">Interval (sec [>=30])</span>
      </div>
      <input
        type="number"
        min="30"
        max="3600"
        step="1"
        placeholder="60"
        class="input input-bordered input-sm w-full"
        bind:value={scheduleInterval}
        on:change={(e) => updateSetting('scheduleInterval', scheduleInterval)}
        disabled={isSchedulingActive}
      />
    </label>

    <div class="flex gap-2">
      {#if !isSchedulingActive}
        <button
          class="btn btn-success btn-sm flex-1"
          on:click={handleStartSchedule}
          disabled={isLoading}
        >
          ▶ Start
        </button>
      {:else}
        <div class="relative flex-1">
          <button
            class="btn btn-error btn-outline btn-sm w-full relative overflow-hidden"
            on:click={handleStopSchedule}
          >
            <div
              class="absolute inset-0 bg-error transition-all"
              style="width: {countdownProgress}%"
            ></div>
            <span class="relative z-10 text-primary-content">⏹ Stop ({countdownSeconds}s)</span>
          </button>
        </div>
      {/if}
    </div>

    {#if isSchedulingActive}
      <div class="alert alert-warning alert-sm py-2 px-3">
        <span class="text-xs">Sending every {scheduleInterval}s, GPS auto-acquired</span>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
