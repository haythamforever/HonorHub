import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  User, 
  Mail, 
  Building,
  Upload,
  Save,
  Lock,
  Image,
  Pen,
  Trash2,
  FileSignature
} from 'lucide-react'
import { settingsAPI } from '../services/api'
import { usersAPI, uploadAPI, authAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { PageHeader, Card, Button, Input, Spinner } from '../components/UI'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user, updateUser } = useAuthStore()
  const queryClient = useQueryClient()
  const logoInputRef = useRef(null)
  const signatureInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    department: user?.department || '',
    signature_name: user?.signature_name || '',
    signature_title: user?.signature_title || '',
  })

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getAll().then(r => r.data),
  })
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data) => usersAPI.update(user.id, data),
    onSuccess: (response) => {
      updateUser(response.data)
      toast.success('Profile updated successfully')
    },
  })

  const updatePasswordMutation = useMutation({
    mutationFn: authAPI.updatePassword,
    onSuccess: () => {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Password updated successfully')
    },
  })

  const uploadLogoMutation = useMutation({
    mutationFn: uploadAPI.uploadLogo,
    onSuccess: (response) => {
      updateProfileMutation.mutate({ logo_path: response.data.path })
    },
  })

  const uploadSignatureMutation = useMutation({
    mutationFn: uploadAPI.uploadSignature,
    onSuccess: (response) => {
      updateProfileMutation.mutate({ signature_path: response.data.path })
    },
  })

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    updateProfileMutation.mutate(formData)
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    updatePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    })
  }

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (type === 'logo') {
      uploadLogoMutation.mutate(file)
    } else {
      uploadSignatureMutation.mutate(file)
    }
  }

  const removeImage = (type) => {
    updateProfileMutation.mutate({ [`${type}_path`]: null })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your account settings and preferences"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg shadow-purple-500/25">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <h2 className="text-xl font-display font-semibold text-gray-800">{user?.name}</h2>
            <p className="text-gray-500">{user?.email}</p>
            <div className="mt-2">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 text-purple-600 text-sm font-medium capitalize">
                {user?.role}
              </span>
            </div>
            {user?.department && (
              <p className="text-sm text-gray-500 mt-3 flex items-center gap-1">
                <Building className="w-4 h-4" />
                {user.department}
              </p>
            )}
          </div>
        </Card>

        {/* Edit Profile */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-gray-800">Edit Profile</h2>
              <p className="text-sm text-gray-500">Update your personal information</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Email"
              value={user?.email || ''}
              disabled
              className="opacity-60"
            />
            <Input
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="e.g., Engineering"
            />
            <Button type="submit" loading={updateProfileMutation.isPending}>
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </form>
        </Card>

        {/* Logo Upload */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
              <Image className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-gray-800">Company Logo</h2>
              <p className="text-sm text-gray-500">Appears on certificates</p>
            </div>
          </div>

          <div className="space-y-4">
            {user?.logo_path ? (
              <div className="relative aspect-video rounded-xl bg-gray-50 overflow-hidden border border-gray-200">
                <img 
                  src={user.logo_path} 
                  alt="Logo" 
                  className="w-full h-full object-contain p-4"
                />
                <button
                  onClick={() => removeImage('logo')}
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
                <Upload className="w-8 h-8 text-purple-400 mb-2" />
                <p className="text-sm text-gray-500">Click to upload logo</p>
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'logo')}
              className="hidden"
            />
            {!user?.logo_path && (
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

        {/* Signature Upload */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
              <Pen className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-gray-800">Signature</h2>
              <p className="text-sm text-gray-500">Your digital signature</p>
            </div>
          </div>

          <div className="space-y-4">
            {user?.signature_path ? (
              <div className="relative aspect-video rounded-xl bg-gray-50 overflow-hidden border border-gray-200">
                <img 
                  src={user.signature_path} 
                  alt="Signature" 
                  className="w-full h-full object-contain p-4"
                />
                <button
                  onClick={() => removeImage('signature')}
                  className="absolute top-2 right-2 p-2 rounded-lg bg-rose-100 text-rose-500 hover:bg-rose-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => signatureInputRef.current?.click()}
                className="aspect-video rounded-xl border-2 border-dashed border-purple-200 hover:border-purple-300 cursor-pointer flex flex-col items-center justify-center transition-colors bg-purple-50/30"
              >
                <Upload className="w-8 h-8 text-purple-400 mb-2" />
                <p className="text-sm text-gray-500">Click to upload signature</p>
              </div>
            )}
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'signature')}
              className="hidden"
            />
            {!user?.signature_path && (
              <Button 
                variant="secondary" 
                onClick={() => signatureInputRef.current?.click()}
                loading={uploadSignatureMutation.isPending}
                className="w-full"
              >
                <Upload className="w-4 h-4" />
                Upload Signature
              </Button>
            )}
          </div>
        </Card>

        {/* Signature Override */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
              <FileSignature className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-gray-800">Certificate Signature</h2>
              <p className="text-sm text-gray-500">Override the default signature when you send certificates</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Your Signature Name"
              placeholder={settings?.global_signature_name || 'Leave blank to use global'}
              value={formData.signature_name}
              onChange={(e) => setFormData({ ...formData, signature_name: e.target.value })}
            />
            <Input
              label="Your Title"
              placeholder={settings?.global_signature_title || 'Leave blank to use global'}
              value={formData.signature_title}
              onChange={(e) => setFormData({ ...formData, signature_title: e.target.value })}
            />
          </div>

          {/* Signature Preview */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 mb-3">Your signature on certificates:</p>
            <div className="text-center py-4">
              <div className="w-32 h-px bg-gray-400 mx-auto mb-2" />
              <p className="font-semibold text-gray-800">
                {formData.signature_name || settings?.global_signature_name || 'Signatory Name'}
              </p>
              <p className="text-sm text-purple-600">
                {formData.signature_title || settings?.global_signature_title || 'Title'}
              </p>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              {formData.signature_name ? 'Using your custom signature' : 'Using global signature settings'}
            </p>
          </div>

          <Button 
            onClick={() => updateProfileMutation.mutate(formData)} 
            loading={updateProfileMutation.isPending}
            className="mt-4"
          >
            <Save className="w-4 h-4" />
            Save Signature
          </Button>
        </Card>

        {/* Change Password */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-gray-800">Change Password</h2>
              <p className="text-sm text-gray-500">Update your password</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              required
              minLength={6}
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              required
            />
            <Button type="submit" loading={updatePasswordMutation.isPending}>
              <Lock className="w-4 h-4" />
              Update Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
