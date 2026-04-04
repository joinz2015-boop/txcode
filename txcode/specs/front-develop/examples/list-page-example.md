---
name: List页面示例
description: 列表页面完整示例
---

```vue
<template>
  <div class="user-list">
    <el-card shadow="never" class="search-card">
      <template #header>
        <div class="card-header">
          <span>查询条件</span>
        </div>
      </template>
      <el-form :inline="true" :model="queryParams">
        <el-form-item label="用户名">
          <el-input v-model="queryParams.username" placeholder="请输入用户名" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>用户列表</span>
          <el-button type="primary" @click="handleAdd">添加用户</el-button>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" link @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="queryParams.page"
        v-model:page-size="queryParams.page_size"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchList"
        @current-change="fetchList"
        class="pagination-container"
      />
    </el-card>
    <AddUser v-model="addVisible" @success="handleSuccess" />
    <EditUser v-model="editVisible" :user-data="currentUser" @success="handleSuccess" />
    <DelUser v-model="delVisible" :user-data="currentUser" @success="handleSuccess" />
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { listUser } from '@/api/user/userApi'
import AddUser from '@/components/user/AddUser.vue'
import EditUser from '@/components/user/EditUser.vue'
import DelUser from '@/components/user/DelUser.vue'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const addVisible = ref(false)
const editVisible = ref(false)
const delVisible = ref(false)
const currentUser = ref(null)

const queryParams = reactive({
  page: 1,
  page_size: 10,
  username: ''
})

const fetchList = async () => {
  loading.value = true
  try {
    const res = await listUser(queryParams)
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  queryParams.page = 1
  fetchList()
}

const handleAdd = () => {
  addVisible.value = true
}

const handleEdit = (row) => {
  currentUser.value = row
  editVisible.value = true
}

const handleDelete = (row) => {
  currentUser.value = row
  delVisible.value = true
}

const handleSuccess = () => {
  fetchList()
}

onMounted(() => {
  fetchList()
})
</script>
```
