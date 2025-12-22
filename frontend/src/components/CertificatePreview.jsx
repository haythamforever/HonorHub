import { useQuery } from '@tanstack/react-query'
import { settingsAPI, getUploadUrl } from '../services/api'
import { useAuthStore } from '../store/authStore'

// Integrant Brand Colors
const BRAND = {
  orange: '#F7941D',
  cyan: '#00B8E6',
  cream: '#FDF8F3',
}

export default function CertificatePreview({ 
  employeeName = 'Employee Name',
  tierName = 'Top Performer',
  tierColor = '#00B8E6',
  period = 'Q4 2025',
  customMessage = '',
}) {
  const { user } = useAuthStore()
  
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getAll().then(r => r.data),
  })

  const signatureName = user?.signature_name || settings?.global_signature_name || 'Signatory Name'
  const signatureTitle = user?.signature_title || settings?.global_signature_title || 'Title'
  const companyLogo = getUploadUrl(settings?.company_logo)

  return (
    <div 
      className="aspect-[1.414/1] rounded-lg shadow-lg overflow-hidden relative"
      style={{ backgroundColor: BRAND.cream, border: `4px solid ${BRAND.orange}` }}
    >
      {/* Inner border (cyan) */}
      <div 
        className="absolute inset-2 border pointer-events-none"
        style={{ borderColor: BRAND.cyan }}
      />
      
      {/* Content */}
      <div className="h-full flex flex-col items-center justify-between py-3 px-4">
        {/* Header with Logo */}
        <div className="text-center">
          {companyLogo ? (
            <img 
              src={companyLogo} 
              alt="Company Logo"
              className="h-6 max-w-[80px] object-contain mx-auto mb-1"
            />
          ) : null}
          <h2 
            className="text-[10px] font-bold tracking-wide"
            style={{ color: BRAND.orange }}
          >
            CERTIFICATE OF RECOGNITION
          </h2>
          <div className="flex items-center justify-center gap-1 my-0.5">
            <div className="w-10 h-[2px]" style={{ backgroundColor: BRAND.orange }} />
            <div className="w-8 h-[1px]" style={{ backgroundColor: BRAND.cyan }} />
          </div>
        </div>

        {/* Main Content */}
        <div className="text-center flex-1 flex flex-col justify-center">
          <p className="text-[7px] text-gray-500 italic mb-0.5">This certifies that</p>
          
          <h1 className="text-sm font-bold text-gray-800 mb-0.5">
            {employeeName}
          </h1>
          
          <div className="w-16 h-px mx-auto mb-1" style={{ backgroundColor: BRAND.orange }} />
          
          <p className="text-[7px] text-gray-500 italic mb-0.5">has been recognized as</p>
          
          <p 
            className="text-xs font-bold uppercase"
            style={{ color: tierColor }}
          >
            {tierName}
          </p>
          
          <p className="text-[7px] text-gray-400 mt-0.5">
            for {period}
          </p>
          
          {customMessage && (
            <p className="text-[6px] text-gray-500 mt-1 italic max-w-[120px] mx-auto">
              "{customMessage}"
            </p>
          )}
        </div>

        {/* Footer - Date and Signature */}
        <div className="w-full flex justify-between items-end px-2">
          <div className="text-center">
            <div className="w-10 h-px bg-gray-400 mx-auto mb-0.5" />
            <p className="text-[6px] text-gray-400">Date</p>
          </div>
          <div className="text-center">
            {signatureName && (
              <p className="font-semibold text-gray-700 text-[8px] mb-0.5">{signatureName}</p>
            )}
            <div className="w-12 h-px bg-gray-400 mx-auto mb-0.5" />
            {signatureTitle ? (
              <p className="text-[6px]" style={{ color: BRAND.cyan }}>{signatureTitle}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

// Larger version for modals/full view
export function CertificatePreviewLarge({ 
  employeeName = 'Employee Name',
  tierName = 'Top Performer',
  tierColor = '#00B8E6',
  period = 'Q4 2025',
  achievementDescription = '',
}) {
  const { user } = useAuthStore()
  
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getAll().then(r => r.data),
  })

  const signatureName = user?.signature_name || settings?.global_signature_name || 'Signatory Name'
  const signatureTitle = user?.signature_title || settings?.global_signature_title || 'Title'
  const companyLogo = getUploadUrl(settings?.company_logo)

  return (
    <div 
      className="aspect-[1.414/1] rounded-xl shadow-2xl overflow-hidden relative"
      style={{ backgroundColor: BRAND.cream, border: `6px solid ${BRAND.orange}` }}
    >
      {/* Inner border (cyan) */}
      <div 
        className="absolute inset-3 border pointer-events-none"
        style={{ borderColor: BRAND.cyan }}
      />
      
      {/* Content */}
      <div className="h-full flex flex-col items-center justify-between py-8 px-8">
        {/* Header with Logo */}
        <div className="text-center">
          {companyLogo ? (
            <img 
              src={companyLogo} 
              alt="Company Logo"
              className="h-12 max-w-[160px] object-contain mx-auto mb-3"
            />
          ) : null}
          <h2 
            className="text-2xl font-bold tracking-wide"
            style={{ color: BRAND.orange }}
          >
            CERTIFICATE OF RECOGNITION
          </h2>
          <div className="flex items-center justify-center gap-2 my-2">
            <div className="w-24 h-[2px]" style={{ backgroundColor: BRAND.orange }} />
            <div className="w-16 h-[1px]" style={{ backgroundColor: BRAND.cyan }} />
          </div>
        </div>

        {/* Main Content */}
        <div className="text-center flex-1 flex flex-col justify-center py-4">
          <p className="text-base text-gray-500 italic mb-3">This certifies that</p>
          
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            {employeeName}
          </h1>
          
          <div className="w-56 h-px mx-auto mb-4" style={{ backgroundColor: BRAND.orange }} />
          
          <p className="text-base text-gray-500 italic mb-3">has been recognized as</p>
          
          <p 
            className="text-3xl font-bold uppercase mb-2"
            style={{ color: tierColor }}
          >
            {tierName}
          </p>
          
          <p className="text-sm text-gray-400">
            for {period}
          </p>
          
          {achievementDescription && (
            <p className="text-sm text-gray-600 mt-4 italic max-w-lg mx-auto">
              "{achievementDescription}"
            </p>
          )}
        </div>

        {/* Footer - Date and Signature */}
        <div className="w-full flex justify-between items-end px-12">
          <div className="text-center">
            <div className="w-32 h-px bg-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Date</p>
          </div>
          <div className="text-center">
            {signatureName && (
              <p className="font-bold text-gray-700 text-lg mb-1">{signatureName}</p>
            )}
            <div className="w-36 h-px bg-gray-400 mx-auto mb-2" />
            {signatureTitle ? (
              <p className="text-sm font-medium" style={{ color: BRAND.cyan }}>{signatureTitle}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
