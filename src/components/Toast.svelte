<script lang="ts">
  import { toasts } from '../lib/toast';

  function getAlertClass(type: string): string {
    return {
      success: 'alert-success',
      error: 'alert-error',
      warning: 'alert-warning',
      info: 'alert-info'
    }[type] || 'alert-info';
  }

  function getIcon(type: string): string {
    return {
      success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      error: 'M10 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l-2 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z',
      warning: 'M12 9v2m0 4v2m0 4v2M12 3a9 9 0 110 18 9 9 0 010-18z',
      info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    }[type] || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }
</script>

<div class="toast toast-top toast-center pointer-events-none z-50">
  {#each $toasts as toast (toast.id)}
    <div class={`alert ${getAlertClass(toast.type)} pointer-events-auto shadow-lg`}>
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
          d={getIcon(toast.type)}
        />
      </svg>
      <span>{toast.message}</span>
    </div>
  {/each}
</div>
