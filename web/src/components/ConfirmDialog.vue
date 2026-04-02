<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  >
    <div class="bg-sidebar border border-border rounded p-4 w-96">
      <p class="text-gray-200 text-sm mb-4">{{ message }}</p>
      <div class="flex justify-end gap-2">
        <button @click="$emit('cancel')" class="px-3 py-1 text-xs text-gray-400 hover:text-white">取消</button>
        <button @click="$emit('confirm')" class="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">确定</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConfirmDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: ''
    }
  }
}
</script>
