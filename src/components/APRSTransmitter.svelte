<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    generateAPRSPacket,
    getGPSLocation,
    validateAPRSCallsign,
    transmitAPRSPacket,
    type APRSTransmissionResult,
    type APRSLocation
  } from '../lib/aprs';

  let callsign = '';
  let passcode = '';
  let additionalText = '';
  let scheduleInterval = 60;
  let isLoading = false;
  let isScheduling = false;
  let location: APRSLocation | null = null;
  let lastResult: APRSTransmissionResult | null = null;
  let scheduledTransmissions: Map<number, NodeJS.Timeout> = new Map();
  let scheduledCallsigns: Set<string> = new Set();

  $: isSchedulingActive = scheduledCallsigns.size > 0;

  const handleGetLocation = async () => {
    isLoading = true;
    try {
      location = await getGPSLocation();
      lastResult = {
        success: true,
        message: `GPS location retrieved: ${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°`,
        timestamp: new Date(),
        callsign: callsign,
      };
    } catch (error) {
      lastResult = {
        success: false,
        message: `Failed to get GPS location: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        callsign: callsign,
      };
    } finally {
      isLoading = false;
    }
  };

  const handleManualTransmit = async () => {
    if (!(await validateInput())) return;
    if (!location) {
      lastResult = {
        success: false,
        message: 'Please get GPS location first',
        timestamp: new Date(),
        callsign: callsign,
      };
      return;
    }

    isLoading = true;
    try {
      const packet = generateAPRSPacket(callsign, location.latitude, location.longitude, additionalText);
      const result = await transmitAPRSPacket(packet, callsign, passcode);
      lastResult = result;
    } catch (error) {
      lastResult = {
        success: false,
        message: `Transmission failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        callsign: callsign,
      };
    } finally {
      isLoading = false;
    }
  };

  const handleStartSchedule = async () => {
    if (!(await validateInput())) return;
    if (!location) {
      lastResult = {
        success: false,
        message: 'Please get GPS location first',
        timestamp: new Date(),
        callsign: callsign,
      };
      return;
    }

    if (scheduleInterval < 30) {
      lastResult = {
        success: false,
        message: 'Minimum interval is 30 seconds',
        timestamp: new Date(),
        callsign: callsign,
      };
      return;
    }

    isScheduling = true;
    scheduledCallsigns.add(callsign);

    const executeScheduledTransmission = async () => {
      try {
        const packet = generateAPRSPacket(callsign, location!.latitude, location!.longitude, additionalText);
        const result = await transmitAPRSPacket(packet, callsign, passcode);
        lastResult = result;
      } catch (error) {
        lastResult = {
          success: false,
          message: `Scheduled transmission failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          callsign: callsign,
        };
      }
    };

    // Execute immediately
    await executeScheduledTransmission();

    // Schedule subsequent transmissions
    const intervalMs = scheduleInterval * 1000;
    const timeoutId = window.setInterval(executeScheduledTransmission, intervalMs);
    scheduledTransmissions.set(Date.now(), timeoutId);
  };

  const handleStopSchedule = () => {
    scheduledTransmissions.forEach((timeoutId) => {
      clearInterval(timeoutId);
    });
    scheduledTransmissions.clear();
    scheduledCallsigns.delete(callsign);
    isScheduling = false;

    lastResult = {
      success: true,
      message: `Scheduled transmissions stopped for ${callsign}`,
      timestamp: new Date(),
      callsign: callsign,
    };
  };

  const validateInput = async (): Promise<boolean> => {
    const isValid = await validateAPRSCallsign(callsign, passcode);
    if (!isValid) {
      lastResult = {
        success: false,
        message: 'Please enter both CALLSIGN and PASSCODE',
        timestamp: new Date(),
        callsign: callsign,
      };
    }
    return isValid;
  };

  onDestroy(() => {
    scheduledTransmissions.forEach((timeoutId) => {
      clearInterval(timeoutId);
    });
  });
</script>

<div class="card w-full max-w-2xl bg-base-100 shadow-xl border border-base-300">
  <div class="card-body">
    <h2 class="card-title text-2xl mb-6">APRS-TX Transmitter</h2>

    <!-- Callsign and Passcode Section -->
    <div class="space-y-4 mb-6">
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Callsign *</span>
        </div>
        <input
          type="text"
          placeholder="N0CALL-1"
          class="input input-bordered w-full"
          bind:value={callsign}
          disabled={isSchedulingActive}
          maxlength="9"
        />
      </label>

      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Passcode *</span>
        </div>
        <input
          type="password"
          placeholder="Enter APRS passcode"
          class="input input-bordered w-full"
          bind:value={passcode}
          disabled={isSchedulingActive}
        />
      </label>

      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Additional Text (optional)</span>
        </div>
        <input
          type="text"
          placeholder="Additional beacon text"
          class="input input-bordered w-full"
          bind:value={additionalText}
          disabled={isSchedulingActive}
          maxlength="50"
        />
      </label>
    </div>

    <!-- GPS Section -->
    <div class="divider">GPS</div>
    <div class="space-y-4 mb-6">
      {#if location}
        <div class="alert alert-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="h-6 w-6 stroke-current shrink-0"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p class="font-semibold">Location: {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°</p>
            <p class="text-sm">Accuracy: ±{location.accuracy?.toFixed(1) ?? 'N/A'} meters</p>
          </div>
        </div>
      {/if}

      <button
        class="btn btn-outline w-full"
        on:click={handleGetLocation}
        disabled={isLoading || isSchedulingActive}
      >
        {#if isLoading}
          <span class="loading loading-spinner"></span>
        {:else}
          📍 Get GPS Location
        {/if}
      </button>
    </div>

    <!-- Transmission Section -->
    <div class="divider">Transmission</div>
    <div class="space-y-4 mb-6">
      <button
        class="btn btn-primary w-full"
        on:click={handleManualTransmit}
        disabled={isLoading || isSchedulingActive}
      >
        {#if isLoading}
          <span class="loading loading-spinner"></span>
        {:else}
          📤 Send Packet
        {/if}
      </button>
    </div>

    <!-- Scheduling Section -->
    <div class="divider">Automatic Transmission</div>
    <div class="space-y-4 mb-6">
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Interval (seconds, min 30)</span>
        </div>
        <input
          type="number"
          min="30"
          max="3600"
          step="1"
          placeholder="60"
          class="input input-bordered w-full"
          bind:value={scheduleInterval}
          disabled={isSchedulingActive}
        />
      </label>

      <div class="flex gap-2">
        {#if !isSchedulingActive}
          <button
            class="btn btn-success flex-1"
            on:click={handleStartSchedule}
            disabled={isLoading}
          >
            ▶ Start Schedule
          </button>
        {:else}
          <button
            class="btn btn-error flex-1"
            on:click={handleStopSchedule}
          >
            ⏹ Stop Schedule
          </button>
        {/if}
      </div>

      {#if isSchedulingActive}
        <div class="alert alert-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="h-6 w-6 stroke-current shrink-0"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4v2m0 4v2M12 3a9 9 0 110 18 9 9 0 010-18z"
            />
          </svg>
          <span>Scheduled transmissions active. Sending every {scheduleInterval} seconds.</span>
        </div>
      {/if}
    </div>

    <!-- Results Section -->
    {#if lastResult}
      <div class="divider">Status</div>
      <div class={`alert ${lastResult.success ? 'alert-success' : 'alert-error'} mb-4`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="h-6 w-6 stroke-current shrink-0"
        >
          {#if lastResult.success}
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          {:else}
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l-2 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          {/if}
        </svg>
        <div>
          <span class="font-semibold">{lastResult.message}</span>
          <p class="text-xs opacity-70">{lastResult.timestamp.toLocaleTimeString()}</p>
        </div>
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
