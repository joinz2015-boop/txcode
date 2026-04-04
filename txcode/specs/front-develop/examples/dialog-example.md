---
name: 添加/修改/删除组件示例
description: 弹窗组件示例（添加、修改、删除）
---

### 添加/修改页面

```vue
<template>
  <el-dialog
    v-model="visible"
    title="添加用户"
    width="600px"
    @close="handleClose"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="loading">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { saveUser } from '@/api/user/userApi'

const props = defineProps({
  modelValue: Boolean,
  userData: Object
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const loading = ref(false)
const formRef = ref(null)

const form = ref({
  id: null,
  username: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.userData) {
    form.value = { ...props.userData }
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const handleClose = () => {
  visible.value = false
  formRef.value?.resetFields()
}

const handleSubmit = async () => {
  await formRef.value.validate()
  loading.value = true
  try {
    await saveUser(form.value)
    emit('success')
    handleClose()
  } finally {
    loading.value = false
  }
}
</script>
```

### 删除页面

```vue
<template>
  <el-dialog
    v-model="visible"
    title="删除确认"
    width="400px"
    @close="handleClose"
  >
    <div style="text-align: center; padding: 20px 0;">
      <el-icon size="48" color="#f56c6c"><WarningFilled /></el-icon>
      <p style="margin-top: 20px; font-size: 16px;">
        确定要删除用户 <strong>{{ userData?.username }}</strong> 吗？
      </p>
      <p style="color: #909399; font-size: 14px; margin-top: 8px;">此操作不可恢复</p>
    </div>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="danger" @click="handleSubmit" :loading="loading">确定删除</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { deleteUser } from '@/api/user/userApi'

const props = defineProps({
  modelValue: Boolean,
  userData: Object
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const loading = ref(false)

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const handleClose = () => {
  visible.value = false
}

const handleSubmit = async () => {
  loading.value = true
  try {
    await deleteUser({ id: props.userData.id })
    emit('success')
    handleClose()
  } finally {
    loading.value = false
  }
}
</script>
```

### 组件间通讯

```js
// 父组件中引用子组件
import AddUser from '@/components/user/AddUser.vue'

const addVisible = ref(false)
const addUserRef = ref(null)

// 打开弹窗并传入数据
const handleAdd = () => {
  addVisible.value = true
}

// 或者调用子组件方法
const openAddDialog = (data) => {
  addUserRef.value?.open(data)
}
```

```vue
<!-- 父组件模板 -->
<AddUser v-model="addVisible" ref="addUserRef" @success="handleSuccess" />
```
