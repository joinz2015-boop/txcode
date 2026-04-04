<template>
  <el-dialog
    :title="isEdit ? 'Edit Repository' : 'Add Repository'"
    :visible.sync="dialogVisible"
    width="500px"
    @close="handleClose"
  >
    <el-form ref="form" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="Name" prop="name">
        <el-input v-model="form.name" placeholder="Repository name"></el-input>
      </el-form-item>
      <el-form-item label="URL" prop="url">
        <el-input v-model="form.url" placeholder="Git repository URL">
          <template #append>
            <el-tooltip content="Can be a Gitee/GitHub repository URL">
              <i class="fa-solid fa-info-circle text-textMuted"></i>
            </el-tooltip>
          </template>
        </el-input>
      </el-form-item>
    </el-form>
    <span slot="footer">
      <el-button @click="handleClose">Cancel</el-button>
      <el-button type="primary" @click="handleSubmit">Confirm</el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: 'SpecRepositoryDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    repository: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      form: {
        name: '',
        url: ''
      },
      rules: {
        name: [{ required: true, message: 'Please enter repository name', trigger: 'blur' }],
        url: [
          { required: true, message: 'Please enter repository URL', trigger: 'blur' },
          { type: 'url', message: 'Please enter a valid URL', trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    dialogVisible: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      }
    },
    isEdit() {
      return !!this.repository
    }
  },
  watch: {
    repository: {
      immediate: true,
      handler(val) {
        if (val) {
          this.form.name = val.name
          this.form.url = val.url
        } else {
          this.form.name = ''
          this.form.url = ''
        }
      }
    }
  },
  methods: {
    handleClose() {
      this.$refs.form?.resetFields()
      this.$emit('close')
    },
    handleSubmit() {
      this.$refs.form.validate(valid => {
        if (valid) {
          this.$emit('submit', {
            id: this.repository?.id,
            name: this.form.name,
            url: this.form.url,
            type: 'custom'
          })
          this.handleClose()
        }
      })
    }
  }
}
</script>
