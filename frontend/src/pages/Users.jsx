import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Users as UsersIcon, 
  Plus, 
  Edit2, 
  Trash2,
  Shield,
  ShieldCheck,
  Mail,
  Building,
  Key,
  UserPlus,
  Check,
  Search,
  X
} from 'lucide-react'
import { usersAPI, employeesAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { PageHeader, Card, Button, Input, Select, Modal, EmptyState, Badge, Spinner } from '../components/UI'
import toast from 'react-hot-toast'

const roleOptions = [
  { value: 'admin', label: 'Admin - Full access to all features' },
  { value: 'manager', label: 'Manager - Can send certificates and manage employees' },
  { value: 'user', label: 'User - Can only send certificates to assigned employees' },
]

const roleColors = {
  admin: 'orange',
  manager: 'cyan',
  user: 'gray',
}

const roleIcons = {
  admin: ShieldCheck,
  manager: Shield,
  user: UsersIcon,
}

export default function Users() {
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [assigningUser, setAssigningUser] = useState(null)
  const { user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.getAll().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: usersAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['users'])
      setShowModal(false)
      toast.success('User created successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create user')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users'])
      setEditingUser(null)
      setShowModal(false)
      toast.success('User updated successfully')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: usersAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['users'])
      toast.success('User deleted successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete user')
    }
  })

  const handleEdit = (user) => {
    setEditingUser(user)
    setShowModal(true)
  }

  const handleDelete = (user) => {
    if (user.id === currentUser?.id) {
      toast.error("You can't delete your own account")
      return
    }
    if (confirm(`Are you sure you want to delete "${user.name}"?`)) {
      deleteMutation.mutate(user.id)
    }
  }

  const handleAssignEmployees = (user) => {
    setAssigningUser(user)
  }

  // Only admins can access this page
  if (currentUser?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="User Management"
          description="Manage system users and their permissions"
        />
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Admin Access Required</h2>
            <p className="text-gray-500 max-w-md">
              Only administrators can manage users and permissions.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage system users and their permissions"
        actions={
          <Button onClick={() => { setEditingUser(null); setShowModal(true) }}>
            <Plus className="w-4 h-4" />
            Add User
          </Button>
        }
      />

      {/* Role Legend */}
      <Card>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Permission Levels</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Badge color="orange">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Admin
            </Badge>
            <span className="text-sm text-gray-500">Full access to all employees</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="cyan">
              <Shield className="w-3 h-3 mr-1" />
              Manager
            </Badge>
            <span className="text-sm text-gray-500">Access to assigned employees</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="gray">
              <UsersIcon className="w-3 h-3 mr-1" />
              User
            </Badge>
            <span className="text-sm text-gray-500">Access to assigned employees only</span>
          </div>
        </div>
      </Card>

      {/* Users List */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        ) : users?.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No users found"
            description="Add users to give them access to the system"
            action={
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4" />
                Add User
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">User</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Department</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Role</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Signature</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((user, index) => {
                  const RoleIcon = roleIcons[user.role] || UsersIcon
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-gray-50 table-row-hover"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#00B8E6] flex items-center justify-center text-white font-medium">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {user.name}
                              {user.id === currentUser?.id && (
                                <span className="ml-2 text-xs text-[#F7941D]">(You)</span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {user.department ? (
                          <span className="text-gray-600 flex items-center gap-1">
                            <Building className="w-4 h-4 text-gray-400" />
                            {user.department}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <Badge color={roleColors[user.role]}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        {user.signature_name ? (
                          <div className="text-sm">
                            <p className="text-gray-800">{user.signature_name}</p>
                            <p className="text-gray-500">{user.signature_title}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">Uses global</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-1">
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => handleAssignEmployees(user)}
                              className="p-2 rounded-lg hover:bg-cyan-50 text-gray-500 hover:text-[#00B8E6] transition-colors"
                              title="Assign Employees"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 rounded-lg hover:bg-orange-50 text-gray-500 hover:text-[#F7941D] transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-2 rounded-lg hover:bg-rose-50 text-gray-500 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit User Modal */}
      <UserModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingUser(null) }}
        user={editingUser}
        onSubmit={(data) => {
          if (editingUser) {
            updateMutation.mutate({ id: editingUser.id, data })
          } else {
            createMutation.mutate(data)
          }
        }}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Assign Employees Modal */}
      {assigningUser && (
        <AssignEmployeesModal
          isOpen={!!assigningUser}
          onClose={() => setAssigningUser(null)}
          user={assigningUser}
        />
      )}
    </div>
  )
}

function UserModal({ isOpen, onClose, user, onSubmit, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    role: 'user',
    signature_name: '',
    signature_title: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        department: user.department || '',
        role: user.role || 'user',
        signature_name: user.signature_name || '',
        signature_title: user.signature_title || '',
      })
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        department: '',
        role: 'user',
        signature_name: '',
        signature_title: '',
      })
    }
  }, [user, isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const data = { ...formData }
    
    // Don't send empty password on update
    if (user && !data.password) {
      delete data.password
    }
    
    onSubmit(data)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Edit User' : 'Add New User'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Full Name"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="john@company.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={user ? 'New Password (leave blank to keep)' : 'Password'}
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!user}
            minLength={6}
          />
          <Input
            label="Department"
            placeholder="Engineering"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          />
        </div>

        <Select
          label="Role & Permissions"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          options={roleOptions}
          required
        />

        {/* Signature Override Section */}
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Key className="w-4 h-4" />
            Signature Override (Optional)
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            Leave blank to use global signature settings. Fill in to override when this user sends certificates.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Signature Name"
              placeholder="e.g., John Smith"
              value={formData.signature_name}
              onChange={(e) => setFormData({ ...formData, signature_name: e.target.value })}
            />
            <Input
              label="Signature Title"
              placeholder="e.g., VP of Engineering"
              value={formData.signature_title}
              onChange={(e) => setFormData({ ...formData, signature_title: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {user ? 'Update' : 'Create'} User
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function AssignEmployeesModal({ isOpen, onClose, user }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [filterAccount, setFilterAccount] = useState('')
  const queryClient = useQueryClient()

  // Get all employees
  const { data: allEmployees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () => employeesAPI.getAll({ all: true }).then(r => r.data),
    enabled: isOpen,
  })

  // Get assigned employees for this user
  const { data: assignedEmployees, isLoading: loadingAssigned } = useQuery({
    queryKey: ['userEmployees', user.id],
    queryFn: () => employeesAPI.getAssignments(user.id).then(r => r.data),
    enabled: isOpen,
  })

  // Get unique accounts
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => employeesAPI.getAccounts().then(r => r.data),
    enabled: isOpen,
  })

  // Initialize selected IDs from assigned employees
  useEffect(() => {
    if (assignedEmployees) {
      setSelectedIds(new Set(assignedEmployees.map(e => e.id)))
    }
  }, [assignedEmployees])

  // Save assignments mutation
  const saveMutation = useMutation({
    mutationFn: (employeeIds) => employeesAPI.updateAssignments(user.id, employeeIds),
    onSuccess: () => {
      queryClient.invalidateQueries(['userEmployees', user.id])
      toast.success('Employee assignments updated')
      onClose()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update assignments')
    }
  })

  // Assign by account mutation
  const assignByAccountMutation = useMutation({
    mutationFn: (accounts) => employeesAPI.assignByAccount(user.id, accounts),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['userEmployees', user.id])
      toast.success(`Assigned ${data.data.assigned} employees`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to assign by account')
    }
  })

  const filteredEmployees = allEmployees?.filter(emp => {
    const matchesSearch = !searchTerm || 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAccount = !filterAccount || emp.account === filterAccount
    return matchesSearch && matchesAccount
  }) || []

  const toggleEmployee = (id) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    setSelectedIds(new Set(filteredEmployees.map(e => e.id)))
  }

  const selectNone = () => {
    setSelectedIds(new Set())
  }

  const handleSave = () => {
    saveMutation.mutate(Array.from(selectedIds))
  }

  const handleAssignByAccount = () => {
    if (filterAccount) {
      assignByAccountMutation.mutate([filterAccount])
    }
  }

  const isLoading = loadingEmployees || loadingAssigned

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Employees to ${user.name}`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Info */}
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
          <p className="text-sm text-cyan-800">
            Select which employees this user can see and send certificates to.
            {user.role !== 'admin' && ' Non-admin users can only access their assigned employees.'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6]"
            />
          </div>
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6]"
          >
            <option value="">All Accounts</option>
            {accounts?.map(acc => (
              <option key={acc} value={acc}>{acc}</option>
            ))}
          </select>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={selectAll}>
            Select All ({filteredEmployees.length})
          </Button>
          <Button variant="secondary" size="sm" onClick={selectNone}>
            Clear Selection
          </Button>
          {filterAccount && (
            <Button 
              variant="accent" 
              size="sm" 
              onClick={handleAssignByAccount}
              loading={assignByAccountMutation.isPending}
            >
              Assign All from {filterAccount}
            </Button>
          )}
        </div>

        {/* Employee List */}
        <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Spinner />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400">
              No employees found
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="w-12 py-3 px-4"></th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Account</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Department</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr 
                    key={emp.id}
                    onClick={() => toggleEmployee(emp.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedIds.has(emp.id) 
                        ? 'bg-cyan-50' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="py-2 px-4">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                        selectedIds.has(emp.id)
                          ? 'bg-[#00B8E6] border-[#00B8E6] text-white'
                          : 'border-gray-300'
                      }`}>
                        {selectedIds.has(emp.id) && <Check className="w-3 h-3" />}
                      </div>
                    </td>
                    <td className="py-2 px-4 text-sm font-medium text-gray-800">{emp.name}</td>
                    <td className="py-2 px-4 text-sm text-gray-500">{emp.email}</td>
                    <td className="py-2 px-4">
                      {emp.account && (
                        <Badge color="cyan">{emp.account}</Badge>
                      )}
                    </td>
                    <td className="py-2 px-4 text-sm text-gray-500">{emp.department || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {selectedIds.size} employee{selectedIds.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saveMutation.isPending}>
              Save Assignments
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
