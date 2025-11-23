<script lang="ts">
  import { recentLogs } from '../lib/toast';

  function getLogClass(type: string): string {
    return {
      success: 'badge-success',
      error: 'badge-error',
      warning: 'badge-warning',
      info: 'badge-info'
    }[type] || 'badge-info';
  }

  function clearLogs() {
    recentLogs.set([]);
  }
</script>

<div class="card w-full bg-base-100 shadow-xl border border-base-300">
  <div class="card-body">
    <div class="flex justify-between items-center mb-4">
      <h2 class="card-title">Operation Logs</h2>
      {#if $recentLogs.length > 0}
        <button class="btn btn-sm btn-outline" on:click={clearLogs}>
          Clear Logs
        </button>
      {/if}
    </div>

    {#if $recentLogs.length === 0}
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
        <span>No logs yet. Operations will appear here.</span>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {#each $recentLogs as log (log.id)}
              <tr class="hover">
                <td class="text-xs whitespace-nowrap">{log.timestamp.toLocaleTimeString()}</td>
                <td>
                  <span class={`badge ${getLogClass(log.type)}`}>
                    {log.type.toUpperCase()}
                  </span>
                </td>
                <td class="text-sm">{log.message}</td>
              </tr>
            {/each}
          </tbody>
        </table>
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
