<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    generateAPRSPacket,
    getGPSLocation,
    validateAPRSCallsign,
    transmitAPRSPacket,
    isGPSLocationStale,
    acquireWakeLock,
    releaseWakeLock,
    type APRSTransmissionResult,
    type APRSLocation
  } from '../lib/aprs';
  import { loadSettings, updateSetting } from '../lib/storage';
  import { showSuccess, showError, showInfo, showWarning, logToHistory } from '../lib/toast';

  let callsign = '';
  let passcode = '';
  let additionalText = '';
  let scheduleInterval = 60;
  let isLoading = false;
  let isScheduling = false;
  let location: APRSLocation | null = null;
  let scheduledTransmissions: Map<number, NodeJS.Timeout> = new Map();
  let scheduledCallsigns: Set<string> = new Set();

  $: isSchedulingActive = scheduledCallsigns.size > 0;

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
        currentLocation = await getGPSLocation();
        location = currentLocation;
      }

      const packet = generateAPRSPacket(callsign, currentLocation.latitude, currentLocation.longitude, additionalText);
      const result = await transmitAPRSPacket(packet, callsign, passcode);
      
      if (result.success) {
        showSuccess(result.message);
        logToHistory(result.message, 'success');
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

    isScheduling = true;
    scheduledCallsigns.add(callsign);

    const executeScheduledTransmission = async () => {
      try {
        let currentLocation = location;
        
        if (!currentLocation || isGPSLocationStale(currentLocation)) {
          currentLocation = await getGPSLocation();
          location = currentLocation;
        }
        
        const packet = generateAPRSPacket(callsign, currentLocation.latitude, currentLocation.longitude, additionalText);
        const result = await transmitAPRSPacket(packet, callsign, passcode);
        
        if (result.success) {
          showSuccess(result.message);
          logToHistory(result.message, 'success');
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

    // Schedule subsequent transmissions
    const intervalMs = scheduleInterval * 1000;
    const timeoutId = window.setInterval(executeScheduledTransmission, intervalMs);
    scheduledTransmissions.set(Date.now(), timeoutId);
  };

  const handleStopSchedule = async () => {
    scheduledTransmissions.forEach((timeoutId) => {
      clearInterval(timeoutId);
    });
    scheduledTransmissions.clear();
    scheduledCallsigns.delete(callsign);
    isScheduling = false;

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
    if (settings.additionalText) additionalText = settings.additionalText;
    if (settings.scheduleInterval) scheduleInterval = settings.scheduleInterval;
  });

  onDestroy(async () => {
    scheduledTransmissions.forEach((timeoutId) => {
      clearInterval(timeoutId);
    });
    await releaseWakeLock();
  });
</script>

<div class="card w-full bg-base-100 shadow-xl border border-base-300">
  <div class="card-body gap-3 p-4">
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

    <label class="form-control mb-2">
      <div class="label py-1">
        <span class="label-text text-sm">Text (optional)</span>
      </div>
      <input
        type="text"
        placeholder="Beacon text"
        class="input input-bordered input-sm w-full"
        bind:value={additionalText}
        on:change={(e) => updateSetting('additionalText', additionalText)}
        disabled={isSchedulingActive}
        maxlength="50"
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

    <button
      class="btn btn-outline btn-sm w-full"
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
      class="btn btn-primary btn-sm w-full"
      on:click={handleManualTransmit}
      disabled={isLoading || isSchedulingActive}
    >
      {#if isLoading}
        <span class="loading loading-spinner loading-xs"></span>
      {:else}
        📤 Send
      {/if}
    </button>

    <div class="divider my-1"></div>

    <label class="form-control mb-2">
      <div class="label py-1">
        <span class="label-text text-sm">Interval (sec, min 30)</span>
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
        <button
          class="btn btn-error btn-sm flex-1"
          on:click={handleStopSchedule}
        >
          ⏹ Stop
        </button>
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
