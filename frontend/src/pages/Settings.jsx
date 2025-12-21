import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Settings as SettingsIcon, 
  Mail, 
  Building,
  Save,
  Send,
  Server,
  Lock,
  FileText,
  Check,
  Upload,
  Trash2,
  Image,
  Pen
} from 'lucide-react'
import { settingsAPI, uploadAPI } from '../services/api'
import { PageHeader, Card, Button, Input, Textarea, Spinner } from '../components/UI'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [settings, setSettings] = useState({})
  const [testEmail, setTestEmail] = useState('')
  const logoInputRef = useRef(null)
  
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getAll().then(r => r.data),
  })

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData)
    }
  }, [settingsData])

  const updateMutation = useMutation({
    mutationFn: settingsAPI.update,
    onSuccess: () => {
      queryClient.invalidateQueries(['settings'])
      toast.success('Settings saved successfully')
    },
  })

  const uploadLogoMutation = useMutation({
    mutationFn: uploadAPI.uploadLogo,
    onSuccess: (response) => {
      setSettings(prev => ({ ...prev, company_logo: response.data.path }))
      toast.success('Logo uploaded successfully')
    },
  })

  const testEmailMutation = useMutation({
    mutationFn: () => settingsAPI.testEmail(testEmail),
    onSuccess: () => {
      toast.success('Test email sent successfully')
      setTestEmail('')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to send test email')
    }
  })

  const handleSave = () => {
    updateMutation.mutate(settings)
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadLogoMutation.mutate(file)
    }
  }

  const removeLogo = () => {
    setSettings(prev => ({ ...prev, company_logo: null }))
  }

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          description="Application settings and configuration"
        />
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Lock className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Admin Access Required</h2>
            <p className="text-gray-500 max-w-md">
              Only administrators can access and modify application settings.
              Contact your admin if you need changes made.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure application settings and email delivery"
        actions={
          <Button onClick={handleSave} loading={updateMutation.isPending}>
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Settings */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <Building className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-gray-800">Company Settings</h2>
              <p className="text-sm text-gray-500">Basic organization information</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Company Name"
              placeholder="Your Company Name"
              value={settings.company_name || ''}
              onChange={(e) => handleChange('company_name', e.target.value)}
            />
          </div>
        </Card>

        {/* Company Logo */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
              <Image className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-gray-800">Company Logo</h2>
              <p className="text-sm text-gray-500">Appears on all certificates</p>
            </div>
          </div>

          <div className="space-y-4">
            {settings.company_logo ? (
              <div className="relative aspect-video rounded-xl bg-gray-50 overflow-hidden border border-gray-200 flex items-center justify-center">
                <img 
                  src={settings.company_logo} 
                  alt="Company Logo" 
                  className="max-h-full max-w-full object-contain p-4"
                />
                <button
                  onClick={removeLogo}
                  className="absolute top-2 right-2 p-2 rounded-lg bg-rose-100 text-rose-500 hover:bg-rose-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => logoInputRef.current?.click()}
                className="aspect-video rounded-xl border-2 border-dashed border-purple-200 hover:border-purple-300 cursor-pointer flex flex-col items-center justify-center transition-colors bg-purple-50/30"
              >
                <Upload className="w-10 h-10 text-purple-400 mb-3" />
                <p className="text-gray-600 font-medium">Click to upload logo</p>
                <p className="text-sm text-gray-400 mt-1">PNG, JPG up to 2MB</p>
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            {!settings.company_logo && (
              <Button 
                variant="secondary" 
                onClick={() => logoInputRef.current?.click()}
                loading={uploadLogoMutation.isPending}
                className="w-full"
              >
                <Upload className="w-4 h-4" />
                Upload Logo
              </Button>
            )}
          </div>
        </Card>

        {/* Global Signature */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
              <Pen className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-gray-800">Global Signature</h2>
              <p className="text-sm text-gray-500">Default signature on certificates (can be overridden per user)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Signatory Name"
              placeholder="e.g., Yousef Awad"
              value={settings.global_signature_name || ''}
              onChange={(e) => handleChange('global_signature_name', e.target.value)}
            />
            <Input
              label="Signatory Title"
              placeholder="e.g., CEO"
              value={settings.global_signature_title || ''}
              onChange={(e) => handleChange('global_signature_title', e.target.value)}
            />
          </div>

          {/* Signature Preview */}
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Preview on certificate:</p>
            <div className="text-center">
              <div className="w-32 h-px bg-gray-400 mx-auto mb-2" />
              <p className="font-semibold text-gray-800">{settings.global_signature_name || 'Signatory Name'}</p>
              <p className="text-sm text-purple-600">{settings.global_signature_title || 'Title'}</p>
            </div>
          </div>
        </Card>

        {/* SMTP Settings */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center">
              <Server className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-gray-800">SMTP Settings</h2>
              <p className="text-sm text-gray-500">Email server configuration</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="SMTP Host"
              placeholder="smtp.gmail.com"
              value={settings.smtp_host || ''}
              onChange={(e) => handleChange('smtp_host', e.target.value)}
            />
            <Input
              label="SMTP Port"
              placeholder="587"
              value={settings.smtp_port || ''}
              onChange={(e) => handleChange('smtp_port', e.target.value)}
            />
            <Input
              label="SMTP Username"
              placeholder="your-email@gmail.com"
              value={settings.smtp_user || ''}
              onChange={(e) => handleChange('smtp_user', e.target.value)}
            />
            <Input
              label="SMTP Password"
              type="password"
              placeholder="App password"
              value={settings.smtp_pass || ''}
              onChange={(e) => handleChange('smtp_pass', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Input
              label="From Name"
              placeholder="HonorHub"
              value={settings.smtp_from_name || ''}
              onChange={(e) => handleChange('smtp_from_name', e.target.value)}
            />
            <Input
              label="From Email"
              placeholder="noreply@company.com"
              value={settings.smtp_from_email || ''}
              onChange={(e) => handleChange('smtp_from_email', e.target.value)}
            />
          </div>
        </Card>

        {/* Email Templates */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-gray-800">Email Templates</h2>
              <p className="text-sm text-gray-500">Customize email content sent with certificates</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Email Subject Template"
              placeholder="Congratulations! You have been recognized as {tier}"
              value={settings.email_subject_template || ''}
              onChange={(e) => handleChange('email_subject_template', e.target.value)}
            />
            <Textarea
              label="Email Body Template"
              placeholder="Enter email body template..."
              rows={6}
              value={settings.email_body_template || ''}
              onChange={(e) => handleChange('email_body_template', e.target.value)}
            />
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 text-sm border border-purple-100">
              <p className="font-medium text-gray-700 mb-2">Available Placeholders:</p>
              <div className="flex flex-wrap gap-2">
                {['{tier}', '{employee_name}', '{custom_message}', '{sender_name}', '{company_name}', '{period}'].map((placeholder) => (
                  <code 
                    key={placeholder}
                    className="px-2 py-1 rounded bg-white border border-gray-200 text-purple-600 text-xs shadow-sm"
                  >
                    {placeholder}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Test Email */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-gray-800">Test Email Configuration</h2>
              <p className="text-sm text-gray-500">Send a test email to verify your SMTP settings</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter email address for test..."
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <Button 
              onClick={() => testEmailMutation.mutate()}
              loading={testEmailMutation.isPending}
              disabled={!testEmail}
            >
              <Send className="w-4 h-4" />
              Send Test
            </Button>
          </div>

          {testEmailMutation.isSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3"
            >
              <Check className="w-5 h-5 text-emerald-500" />
              <span className="text-emerald-700">Test email sent successfully! Check your inbox.</span>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  )
}
