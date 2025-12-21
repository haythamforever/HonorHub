import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Send, 
  Users,
  Trophy, 
  Layers,
  Mail,
  Check,
  Search,
  Sparkles,
  Calendar
} from 'lucide-react'
import { employeesAPI, tiersAPI, templatesAPI, certificatesAPI } from '../services/api'
import { PageHeader, Card, Button, Select, Textarea, Spinner, Badge } from '../components/UI'
import toast from 'react-hot-toast'

// Generate period options - Quarters and Months
const generatePeriodOptions = () => {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  const currentQuarter = Math.floor(currentMonth / 3) + 1
  const prevYear = currentYear - 1
  
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December']
  
  // Quarters - current year up to current quarter, then previous year
  const quarters = []
  for (let q = currentQuarter; q >= 1; q--) {
    quarters.push({ value: `Q${q} ${currentYear}`, label: `Q${q} ${currentYear}` })
  }
  for (let q = 4; q >= 1; q--) {
    quarters.push({ value: `Q${q} ${prevYear}`, label: `Q${q} ${prevYear}` })
  }
  
  // Months - current year up to current month, then previous year
  const monthOptions = []
  for (let m = currentMonth; m >= 0; m--) {
    monthOptions.push({ value: `${months[m]} ${currentYear}`, label: `${months[m]} ${currentYear}` })
  }
  for (let m = 11; m >= 0; m--) {
    monthOptions.push({ value: `${months[m]} ${prevYear}`, label: `${months[m]} ${prevYear}` })
  }
  
  return { quarters, months: monthOptions }
}

export default function BulkSend() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [periodType, setPeriodType] = useState('quarter') // 'quarter' or 'month'
  const [formData, setFormData] = useState({
    tier_id: '',
    template_id: '',
    custom_message: '',
    period: `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`,
    send_email: true
  })

  const { quarters, months } = generatePeriodOptions()
  const periodOptions = periodType === 'quarter' ? quarters : months

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesAPI.getAll().then(r => r.data),
  })

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => employeesAPI.getAccounts().then(r => r.data),
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => employeesAPI.getDepartments().then(r => r.data),
  })

  const { data: tiers } = useQuery({
    queryKey: ['tiers'],
    queryFn: () => tiersAPI.getAll().then(r => r.data),
  })

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesAPI.getAll().then(r => r.data),
  })

  // Filter employees based on search and filters
  const filteredEmployees = useMemo(() => {
    if (!employees) return []
    
    return employees.filter(emp => {
      const matchesSearch = !searchTerm || 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesAccount = !filterAccount || emp.account === filterAccount
      const matchesDepartment = !filterDepartment || emp.department === filterDepartment
      
      return matchesSearch && matchesAccount && matchesDepartment
    })
  }, [employees, searchTerm, filterAccount, filterDepartment])

  const bulkSendMutation = useMutation({
    mutationFn: certificatesAPI.bulkCreate,
    onSuccess: (response) => {
      // Invalidate certificates cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['certificates'] })
      toast.success(`Successfully sent ${response.data.success} certificates`)
      navigate('/certificates')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to send certificates')
    }
  })

  const handleToggleEmployee = (employee) => {
    setSelectedEmployees(prev => {
      const exists = prev.find(e => e.id === employee.id)
      if (exists) {
        return prev.filter(e => e.id !== employee.id)
      }
      return [...prev, employee]
    })
  }

  const handleSelectAll = () => {
    // Select/deselect all FILTERED employees
    const allFilteredSelected = filteredEmployees.every(emp => 
      selectedEmployees.some(s => s.id === emp.id)
    )
    
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelectedEmployees(prev => 
        prev.filter(s => !filteredEmployees.some(f => f.id === s.id))
      )
    } else {
      // Select all filtered (merge with existing selection)
      setSelectedEmployees(prev => {
        const newSelection = [...prev]
        filteredEmployees.forEach(emp => {
          if (!newSelection.some(s => s.id === emp.id)) {
            newSelection.push(emp)
          }
        })
        return newSelection
      })
    }
  }

  const handleClearSelection = () => {
    setSelectedEmployees([])
  }

  const handleSend = () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee')
      return
    }
    if (!formData.tier_id) {
      toast.error('Please select a performance tier')
      return
    }
    if (!formData.template_id) {
      toast.error('Please select a template')
      return
    }

    const certificates = selectedEmployees.map(emp => ({
      employee_id: emp.id,
      tier_id: parseInt(formData.tier_id),
      template_id: parseInt(formData.template_id),
      custom_message: formData.custom_message,
      period: formData.period
    }))

    bulkSendMutation.mutate({
      certificates,
      send_email: formData.send_email
    })
  }

  const selectedTier = tiers?.find(t => t.id === parseInt(formData.tier_id))
  const selectedTemplate = templates?.find(t => t.id === parseInt(formData.template_id))
  
  const allFilteredSelected = filteredEmployees.length > 0 && 
    filteredEmployees.every(emp => selectedEmployees.some(s => s.id === emp.id))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Send Certificates"
        description="Send certificates to multiple employees at once"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Selection */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Select Employees</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedEmployees.length} of {employees?.length || 0} selected
                </p>
              </div>
              <div className="flex gap-2">
                {selectedEmployees.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                  >
                    Clear
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {allFilteredSelected ? 'Deselect All' : `Select All (${filteredEmployees.length})`}
                </Button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6] text-sm"
                />
              </div>
              {accounts?.length > 0 && (
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6]"
                >
                  <option value="">All Accounts</option>
                  {accounts.map(acc => (
                    <option key={acc} value={acc}>{acc}</option>
                  ))}
                </select>
              )}
              {departments?.length > 0 && (
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6]"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Filtered count */}
            {(searchTerm || filterAccount || filterDepartment) && (
              <p className="text-xs text-gray-500 mb-3">
                Showing {filteredEmployees.length} of {employees?.length} employees
              </p>
            )}

            {loadingEmployees ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Users className="w-12 h-12 mb-3 opacity-50" />
                <p>No employees found</p>
                {(searchTerm || filterAccount || filterDepartment) && (
                  <button 
                    onClick={() => { setSearchTerm(''); setFilterAccount(''); setFilterDepartment('') }}
                    className="text-[#00B8E6] hover:underline text-sm mt-2"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto pr-2">
                {filteredEmployees.map((employee) => {
                  const isSelected = selectedEmployees.some(e => e.id === employee.id)
                  return (
                    <motion.button
                      key={employee.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleToggleEmployee(employee)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-[#00B8E6] bg-cyan-50'
                          : 'border-gray-200 hover:border-[#00B8E6]'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center transition-all flex-shrink-0 ${
                          isSelected
                            ? 'bg-[#00B8E6] text-white'
                            : 'bg-gray-100 border border-gray-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-[#00B8E6] flex items-center justify-center text-white text-sm flex-shrink-0">
                        {employee.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate text-sm">{employee.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {employee.account && <span className="text-[#00B8E6]">{employee.account}</span>}
                          {employee.account && employee.department && ' • '}
                          {employee.department}
                        </p>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Configuration */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Certificate Settings</h2>
            
            <div className="space-y-4">
              <Select
                label="Performance Tier"
                value={formData.tier_id}
                onChange={(e) => setFormData({ ...formData, tier_id: e.target.value })}
                options={tiers?.map(t => ({ value: t.id.toString(), label: t.name })) || []}
                placeholder="Select tier..."
              />

              <Select
                label="Certificate Template"
                value={formData.template_id}
                onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                options={templates?.map(t => ({ value: t.id.toString(), label: t.name })) || []}
                placeholder="Select template..."
              />

              {/* Period Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Recognition Period
                </label>
                
                {/* Quarter/Month Toggle */}
                <div className="flex rounded-lg bg-gray-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodType('quarter')
                      setFormData({ ...formData, period: quarters[0]?.value || '' })
                    }}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                      periodType === 'quarter'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Quarter
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodType('month')
                      setFormData({ ...formData, period: months[0]?.value || '' })
                    }}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                      periodType === 'month'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Month
                  </button>
                </div>
                
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6]"
                  >
                    {periodOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Textarea
                label="Message (optional)"
                placeholder="Add a message to include in all certificates..."
                rows={3}
                value={formData.custom_message}
                onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
              />

              <label className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 cursor-pointer border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.send_email}
                  onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-[#00B8E6] focus:ring-[#00B8E6]"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Send Emails</p>
                  <p className="text-sm text-gray-500">
                    Email certificates to recipients
                  </p>
                </div>
                <Mail className="w-5 h-5 text-gray-400" />
              </label>
            </div>
          </Card>

          {/* Summary */}
          <Card>
            <h3 className="font-semibold text-gray-800 mb-4">Summary</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Recipients</span>
                <Badge color={selectedEmployees.length > 0 ? 'cyan' : 'gray'}>
                  {selectedEmployees.length} employees
                </Badge>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Tier</span>
                {selectedTier ? (
                  <span style={{ color: selectedTier.color }}>{selectedTier.name}</span>
                ) : (
                  <span className="text-gray-400">Not selected</span>
                )}
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Period</span>
                <span className="text-gray-800">{formData.period}</span>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500">Template</span>
                <span className="text-gray-800">{selectedTemplate?.name || <span className="text-gray-400">Not selected</span>}</span>
              </div>
            </div>

            <Button
              onClick={handleSend}
              loading={bulkSendMutation.isPending}
              disabled={selectedEmployees.length === 0 || !formData.tier_id || !formData.template_id}
              className="w-full mt-6"
            >
              <Sparkles className="w-4 h-4" />
              Send {selectedEmployees.length} Certificate{selectedEmployees.length !== 1 ? 's' : ''}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
