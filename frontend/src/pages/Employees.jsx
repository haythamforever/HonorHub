import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Users, 
  Plus, 
  Search, 
  Upload, 
  Edit2, 
  Trash2,
  Mail,
  Building,
  Briefcase,
  Download,
  Check,
  FileSpreadsheet,
  Filter,
  CheckSquare,
  Square,
  X
} from 'lucide-react'
import { employeesAPI, uploadAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { PageHeader, Card, Button, Input, Modal, EmptyState, Badge, Spinner, Pagination } from '../components/UI'
import toast from 'react-hot-toast'

export default function Employees() {
  const [search, setSearch] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [importedData, setImportedData] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  
  const queryClient = useQueryClient()

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', search, filterAccount],
    queryFn: () => employeesAPI.getAll({ search, account: filterAccount }).then(r => r.data),
  })

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => employeesAPI.getAccounts().then(r => r.data),
  })

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds([])
  }, [search, filterAccount])

  // Paginate employees
  const totalItems = employees?.length || 0
  const totalPages = Math.ceil(totalItems / pageSize)
  const paginatedEmployees = employees?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const createMutation = useMutation({
    mutationFn: employeesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['employees'])
      setShowAddModal(false)
      toast.success('Employee added successfully')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => employeesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees'])
      setEditingEmployee(null)
      toast.success('Employee updated successfully')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: employeesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['employees'])
      toast.success('Employee deleted successfully')
    },
  })

  const bulkCreateMutation = useMutation({
    mutationFn: employeesAPI.bulkCreate,
    onSuccess: (response) => {
      queryClient.invalidateQueries(['employees'])
      queryClient.invalidateQueries(['accounts'])
      setShowImportModal(false)
      setImportedData(null)
      toast.success(`Imported ${response.data.success} employees`)
    },
  })

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const response = await uploadAPI.uploadEmployeesCSV(file)
      setImportedData(response.data)
    } catch (error) {
      toast.error('Failed to parse CSV file')
    }
  }

  const handleBulkImport = () => {
    if (importedData?.employees) {
      bulkCreateMutation.mutate(importedData.employees)
    }
  }

  const downloadTemplate = () => {
    const csv = 'Displayname,mail,Manager,Account,Description,employeeType,Department\nAhmed Abu-Daia,Ahmed.abudaia@integrant.com,Mostafa Samir,AAM,Senior Technical Project Lead,Full-Time,Operations'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'employees_template.csv'
    a.click()
  }

  // Multi-select handlers
  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedEmployees?.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(paginatedEmployees?.map(e => e.id) || [])
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} employees?`)) {
      return
    }
    
    let deleted = 0
    for (const id of selectedIds) {
      try {
        await employeesAPI.delete(id)
        deleted++
      } catch (error) {
        console.error('Failed to delete employee:', id)
      }
    }
    
    queryClient.invalidateQueries(['employees'])
    setSelectedIds([])
    toast.success(`Deleted ${deleted} employees`)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
    setSelectedIds([])
  }

  const handlePageSizeChange = (size) => {
    setPageSize(size)
    setCurrentPage(1)
    setSelectedIds([])
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description={isAdmin ? "Manage your employee directory" : "Your assigned employees"}
        actions={
          isAdmin && (
            <>
              <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                <Upload className="w-4 h-4" />
                Import CSV
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4" />
                Add Employee
              </Button>
            </>
          )
        }
      />

      {/* Search & Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees by name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6]"
            />
          </div>
          {accounts?.length > 0 && (
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6]"
            >
              <option value="">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </select>
          )}
        </div>
      </Card>

      {/* Bulk Actions Bar */}
      {isAdmin && selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#F7941D] text-white rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5" />
            <span className="font-medium">{selectedIds.length} employee{selectedIds.length > 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="!bg-white/20 !text-white hover:!bg-white/30 !border-0"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkDelete}
              className="!bg-rose-500 !text-white hover:!bg-rose-600 !border-0"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </Button>
          </div>
        </motion.div>
      )}

      {/* Employees List */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        ) : employees?.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees found"
            description={isAdmin ? "Add employees manually or import from CSV" : "No employees assigned to you yet"}
            action={
              isAdmin && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4" />
                  Add Employee
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {isAdmin && (
                      <th className="py-4 px-4 w-12">
                        <button
                          onClick={toggleSelectAll}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                        >
                          {selectedIds.length === paginatedEmployees?.length && paginatedEmployees?.length > 0 ? (
                            <CheckSquare className="w-5 h-5 text-[#F7941D]" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </th>
                    )}
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Employee</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Account</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Department</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Position</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Manager</th>
                    {isAdmin && (
                      <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees?.map((employee, index) => (
                    <motion.tr
                      key={employee.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`border-b border-gray-50 table-row-hover ${
                        selectedIds.includes(employee.id) ? 'bg-orange-50' : ''
                      }`}
                    >
                      {isAdmin && (
                        <td className="py-4 px-4">
                          <button
                            onClick={() => toggleSelect(employee.id)}
                            className="p-1 rounded hover:bg-gray-100 transition-colors"
                          >
                            {selectedIds.includes(employee.id) ? (
                              <CheckSquare className="w-5 h-5 text-[#F7941D]" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#00B8E6] flex items-center justify-center text-white font-medium">
                            {employee.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{employee.name}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {employee.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {employee.account ? (
                          <Badge color="cyan">{employee.account}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {employee.department ? (
                          <span className="text-gray-600">{employee.department}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {employee.position ? (
                          <span className="text-gray-600 text-sm">{employee.position}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-gray-500 text-sm">{employee.manager_name || '-'}</span>
                      </td>
                      {isAdmin && (
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingEmployee(employee)}
                              className="p-2 rounded-lg hover:bg-orange-50 text-gray-500 hover:text-[#F7941D] transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this employee?')) {
                                  deleteMutation.mutate(employee.id)
                                }
                              }}
                              className="p-2 rounded-lg hover:bg-rose-50 text-gray-500 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-100 p-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  pageSizeOptions={[25, 50, 100, 200]}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Add/Edit Employee Modal */}
      <EmployeeModal
        isOpen={showAddModal || !!editingEmployee}
        onClose={() => {
          setShowAddModal(false)
          setEditingEmployee(null)
        }}
        employee={editingEmployee}
        onSubmit={(data) => {
          if (editingEmployee) {
            updateMutation.mutate({ id: editingEmployee.id, data })
          } else {
            createMutation.mutate(data)
          }
        }}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false)
          setImportedData(null)
        }}
        title="Import Employees from CSV"
        size="lg"
      >
        <div className="space-y-6">
          {/* CSV Format Info */}
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-[#00B8E6] mt-0.5" />
              <div>
                <p className="font-medium text-cyan-800 mb-1">Expected CSV Format</p>
                <p className="text-sm text-cyan-700">
                  Columns: Displayname, mail, Manager, Account, Description, employeeType, Department
                </p>
              </div>
            </div>
          </div>

          {!importedData ? (
            <>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[#00B8E6] transition-colors bg-gray-50">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Upload your CSV file</p>
                <p className="text-sm text-gray-400 mb-4">
                  Supports the standard employee export format
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label 
                  htmlFor="csv-upload"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium cursor-pointer bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm transition-colors"
                >
                  Select File
                </label>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm text-[#00B8E6] hover:underline"
              >
                <Download className="w-4 h-4" />
                Download template CSV
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <Check className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="font-medium text-emerald-700">File parsed successfully</p>
                  <p className="text-sm text-emerald-600">
                    {importedData.employees.length} employees found
                    {importedData.totalParseErrors > 0 && (
                      <span className="text-amber-600 ml-2">
                        ({importedData.totalParseErrors} rows skipped)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-4 text-gray-500">Name</th>
                      <th className="text-left py-2 px-4 text-gray-500">Email</th>
                      <th className="text-left py-2 px-4 text-gray-500">Account</th>
                      <th className="text-left py-2 px-4 text-gray-500">Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedData.employees.slice(0, 15).map((emp, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="py-2 px-4 text-gray-800">{emp.Displayname}</td>
                        <td className="py-2 px-4 text-gray-500">{emp.mail}</td>
                        <td className="py-2 px-4">
                          {emp.Account && <Badge color="cyan">{emp.Account}</Badge>}
                        </td>
                        <td className="py-2 px-4 text-gray-500">{emp.Department || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importedData.employees.length > 15 && (
                  <p className="text-center py-2 text-sm text-gray-400">
                    ...and {importedData.employees.length - 15} more
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setImportedData(null)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkImport} loading={bulkCreateMutation.isPending}>
                  Import {importedData.employees.length} Employees
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

function EmployeeModal({ isOpen, onClose, employee, onSubmit, loading }) {
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    department: '',
    position: '',
    manager_name: '',
    account: '',
    employee_type: ''
  })

  useEffect(() => {
    if (employee) {
      setFormData({
        employee_id: employee.employee_id || '',
        name: employee.name || '',
        email: employee.email || '',
        department: employee.department || '',
        position: employee.position || '',
        manager_name: employee.manager_name || '',
        account: employee.account || '',
        employee_type: employee.employee_type || ''
      })
    } else {
      setFormData({
        employee_id: '',
        name: '',
        email: '',
        department: '',
        position: '',
        manager_name: '',
        account: '',
        employee_type: ''
      })
    }
  }, [employee, isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employee ? 'Edit Employee' : 'Add Employee'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Full Name (Displayname)"
            placeholder="Ahmed Abu-Daia"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Email (mail)"
            type="email"
            placeholder="ahmed@integrant.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Account"
            placeholder="AAM"
            value={formData.account}
            onChange={(e) => setFormData({ ...formData, account: e.target.value })}
          />
          <Input
            label="Manager"
            placeholder="Mostafa Samir"
            value={formData.manager_name}
            onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Position (Description)"
            placeholder="Senior Software Engineer"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          />
          <Input
            label="Employee Type"
            placeholder="Full-Time"
            value={formData.employee_type}
            onChange={(e) => setFormData({ ...formData, employee_type: e.target.value })}
          />
        </div>
        <Input
          label="Department"
          placeholder="Operations"
          value={formData.department}
          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {employee ? 'Update' : 'Add'} Employee
          </Button>
        </div>
      </form>
    </Modal>
  )
}
