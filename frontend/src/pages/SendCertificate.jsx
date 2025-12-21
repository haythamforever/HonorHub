import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Send, 
  User, 
  Trophy, 
  Layers,
  Mail,
  Award,
  ChevronRight,
  Check,
  Search,
  Calendar
} from 'lucide-react'
import { employeesAPI, tiersAPI, templatesAPI, certificatesAPI } from '../services/api'
import { PageHeader, Card, Button, Textarea, Spinner } from '../components/UI'
import CertificatePreview from '../components/CertificatePreview'
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

export default function SendCertificate() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [periodType, setPeriodType] = useState('quarter') // 'quarter' or 'month'
  const [formData, setFormData] = useState({
    employee_id: null,
    tier_id: null,
    template_id: null,
    custom_message: '',
    achievement_description: '',
    period: `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`,
    send_email: true
  })
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedTier, setSelectedTier] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  
  const { quarters, months } = generatePeriodOptions()
  const periodOptions = periodType === 'quarter' ? quarters : months

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees', employeeSearch],
    queryFn: () => employeesAPI.getAll({ search: employeeSearch }).then(r => r.data),
    enabled: step === 1,
  })

  const { data: tiers, isLoading: loadingTiers } = useQuery({
    queryKey: ['tiers'],
    queryFn: () => tiersAPI.getAll().then(r => r.data),
    enabled: step === 2,
  })

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesAPI.getAll().then(r => r.data),
    enabled: step === 3,
  })

  const sendMutation = useMutation({
    mutationFn: certificatesAPI.create,
    onSuccess: () => {
      // Invalidate certificates cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['certificates'] })
      toast.success('Certificate sent successfully!')
      navigate('/certificates')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to send certificate')
    }
  })

  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee)
    setFormData({ ...formData, employee_id: employee.id })
    setStep(2)
  }

  const handleSelectTier = (tier) => {
    setSelectedTier(tier)
    setFormData({ ...formData, tier_id: tier.id })
    setStep(3)
  }

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template)
    setFormData({ ...formData, template_id: template.id })
    setStep(4)
  }

  const handleSend = () => {
    sendMutation.mutate(formData)
  }

  const steps = [
    { number: 1, title: 'Select Employee', icon: User },
    { number: 2, title: 'Choose Tier', icon: Trophy },
    { number: 3, title: 'Pick Template', icon: Layers },
    { number: 4, title: 'Customize & Send', icon: Send },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Send Certificate"
        description="Recognize an employee's outstanding performance"
      />

      {/* Steps Progress */}
      <div className="flex items-center justify-between max-w-3xl mx-auto mb-8">
        {steps.map((s, index) => (
          <div key={s.number} className="flex items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-3 ${
                step >= s.number ? 'text-[#F7941D]' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  step > s.number
                    ? 'bg-emerald-500 text-white'
                    : step === s.number
                    ? 'bg-[#F7941D] text-white shadow-md'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step > s.number ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <s.icon className="w-5 h-5" />
                )}
              </div>
              <span className="hidden md:block font-medium">{s.title}</span>
            </motion.div>
            {index < steps.length - 1 && (
              <ChevronRight className="w-5 h-5 text-gray-300 mx-4 hidden md:block" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto">
        {/* Step 1: Select Employee */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Select an Employee</h2>
              
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6]"
                />
              </div>

              {loadingEmployees ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {employees?.map((employee) => (
                    <motion.button
                      key={employee.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => handleSelectEmployee(employee)}
                      className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-all ${
                        selectedEmployee?.id === employee.id
                          ? 'border-[#00B8E6] bg-cyan-50'
                          : 'border-gray-200 hover:border-[#00B8E6] hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full bg-[#00B8E6] flex items-center justify-center text-white font-medium text-lg">
                        {employee.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{employee.name}</p>
                        <p className="text-sm text-gray-500 truncate">{employee.email}</p>
                        {employee.department && (
                          <p className="text-xs text-gray-400 mt-0.5">{employee.department}</p>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Step 2: Choose Tier */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Choose Performance Tier</h2>
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-500 hover:text-[#00B8E6]"
                >
                  ← Back
                </button>
              </div>

              {/* Selected Employee */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 mb-6">
                <div className="w-9 h-9 rounded-full bg-[#00B8E6] flex items-center justify-center text-white text-sm">
                  {selectedEmployee?.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedEmployee?.name}</p>
                  <p className="text-sm text-gray-500">{selectedEmployee?.email}</p>
                </div>
              </div>

              {loadingTiers ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tiers?.map((tier) => (
                    <motion.button
                      key={tier.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => handleSelectTier(tier)}
                      className="p-5 rounded-lg border border-gray-200 hover:border-gray-300 text-left transition-all hover:shadow-sm"
                    >
                      <div 
                        className="w-11 h-11 rounded-lg flex items-center justify-center mb-3"
                        style={{ backgroundColor: `${tier.color}15` }}
                      >
                        <Trophy className="w-5 h-5" style={{ color: tier.color }} />
                      </div>
                      <h3 className="text-lg font-semibold mb-1" style={{ color: tier.color }}>
                        {tier.name}
                      </h3>
                      <p className="text-sm text-gray-500">{tier.description}</p>
                    </motion.button>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Step 3: Pick Template */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Pick a Template</h2>
                <button
                  onClick={() => setStep(2)}
                  className="text-sm text-gray-500 hover:text-[#00B8E6]"
                >
                  ← Back
                </button>
              </div>

              {loadingTemplates ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {templates?.map((template) => (
                    <motion.button
                      key={template.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => handleSelectTemplate(template)}
                      className={`rounded-lg border overflow-hidden text-left transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-[#00B8E6] ring-2 ring-[#00B8E6]/30'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div 
                        className="aspect-[1.414/1] p-4"
                        style={{ background: template.design_config.background }}
                      >
                        <div 
                          className="h-full border-2 rounded flex items-center justify-center"
                          style={{ borderColor: template.design_config.borderColor }}
                        >
                          <Award 
                            className="w-8 h-8" 
                            style={{ color: template.design_config.accentColor }} 
                          />
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50">
                        <p className="font-medium text-gray-900">{template.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Step 4: Customize & Send */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Customize Certificate</h2>
                  <button
                    onClick={() => setStep(3)}
                    className="text-sm text-gray-500 hover:text-[#00B8E6]"
                  >
                    ← Back
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Period Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Recognition Period
                    </label>
                    
                    {/* Quarter/Month Toggle */}
                    <div className="flex rounded-lg bg-gray-100 p-1 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPeriodType('quarter')
                          setFormData({ ...formData, period: quarters[0]?.value || '' })
                        }}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
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
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                          periodType === 'month'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Month
                      </button>
                    </div>
                    
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={formData.period}
                        onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                        className="w-full pl-11 pr-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6] transition-colors"
                      >
                        {periodOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Textarea
                    label="Achievement Description (optional)"
                    placeholder="Describe the specific achievement or contribution..."
                    rows={3}
                    value={formData.achievement_description}
                    onChange={(e) => setFormData({ ...formData, achievement_description: e.target.value })}
                  />

                  <Textarea
                    label="Personal Message (optional)"
                    placeholder="Add a personal message to include in the email..."
                    rows={3}
                    value={formData.custom_message}
                    onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
                  />

                  <label className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 cursor-pointer border border-gray-200">
                    <input
                      type="checkbox"
                      checked={formData.send_email}
                      onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-[#00B8E6] focus:ring-[#00B8E6]"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Send Email</p>
                      <p className="text-sm text-gray-500">
                        Email the certificate to {selectedEmployee?.email}
                      </p>
                    </div>
                    <Mail className="w-5 h-5 text-gray-400 ml-auto" />
                  </label>

                  <Button
                    onClick={handleSend}
                    loading={sendMutation.isPending}
                    className="w-full mt-4"
                  >
                    <Send className="w-4 h-4" />
                    Send Certificate
                  </Button>
                </div>
              </Card>

              {/* Preview */}
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Preview</h2>
                
                <div className="max-w-xs mx-auto">
                  <CertificatePreview
                    employeeName={selectedEmployee?.name}
                    tierName={selectedTier?.name}
                    tierColor={selectedTier?.color}
                    period={formData.period}
                    customMessage={formData.achievement_description}
                  />
                </div>

                <div className="mt-6 p-4 rounded-lg bg-gray-50 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Employee:</span>
                    <span className="text-gray-900">{selectedEmployee?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Tier:</span>
                    <span style={{ color: selectedTier?.color }}>{selectedTier?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Period:</span>
                    <span className="text-gray-900">{formData.period}</span>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
