import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Layers, 
  Award,
  Check,
  Star
} from 'lucide-react'
import { templatesAPI, settingsAPI } from '../services/api'
import { PageHeader, Card, Badge, Spinner } from '../components/UI'
import toast from 'react-hot-toast'

// Integrant Brand Colors
const BRAND = {
  orange: '#F7941D',
  cyan: '#00B8E6',
  cream: '#FDF8F3',
}

// Different template preview designs
const TemplatePreview = ({ template, design, companyLogo }) => {
  // Classic style - clean with double border
  if (design === 'classic') {
    return (
      <div 
        className="aspect-[1.414/1] rounded-lg overflow-hidden relative"
        style={{ backgroundColor: BRAND.cream, border: `3px solid ${BRAND.orange}` }}
      >
        {/* Inner border */}
        <div className="absolute inset-1.5 border" style={{ borderColor: BRAND.cyan }} />
        
        <div className="h-full flex flex-col items-center justify-center p-3 text-center">
          {companyLogo && (
            <img src={companyLogo} alt="Logo" className="h-4 max-w-[50px] object-contain mb-1" />
          )}
          <p className="text-[8px] font-bold tracking-wide mb-0.5" style={{ color: BRAND.orange }}>
            CERTIFICATE OF RECOGNITION
          </p>
          <div className="flex gap-0.5 my-0.5">
            <div className="w-8 h-[1px]" style={{ backgroundColor: BRAND.orange }} />
            <div className="w-5 h-[1px]" style={{ backgroundColor: BRAND.cyan }} />
          </div>
          <p className="text-[6px] text-gray-500 italic">This certifies that</p>
          <p className="text-[10px] font-bold text-gray-800 my-0.5">Employee Name</p>
          <p className="text-[6px] text-gray-500 italic">has been recognized as</p>
          <p className="text-[8px] font-bold" style={{ color: BRAND.cyan }}>TOP PERFORMER</p>
        </div>
      </div>
    )
  }
  
  // Modern style - clean with accent bar
  if (design === 'modern') {
    return (
      <div className="aspect-[1.414/1] rounded-lg overflow-hidden relative bg-white border border-gray-200">
        {/* Top accent bar */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${BRAND.orange}, ${BRAND.cyan})` }} />
        
        <div className="h-full flex flex-col items-center justify-center p-3 text-center">
          {companyLogo && (
            <img src={companyLogo} alt="Logo" className="h-4 max-w-[50px] object-contain mb-1" />
          )}
          <p className="text-[7px] tracking-widest text-gray-400 uppercase">Certificate of</p>
          <p className="text-[10px] font-bold" style={{ color: BRAND.cyan }}>Recognition</p>
          <div className="my-1.5">
            <p className="text-[9px] font-bold text-gray-800">Employee Name</p>
            <div className="w-10 h-px mx-auto mt-0.5" style={{ backgroundColor: BRAND.orange }} />
          </div>
          <p className="text-[7px] font-medium" style={{ color: BRAND.orange }}>Top Performer</p>
        </div>
        
        {/* Bottom accent */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: BRAND.cyan }} />
      </div>
    )
  }
  
  // Elegant style - refined borders
  if (design === 'elegant') {
    return (
      <div 
        className="aspect-[1.414/1] rounded-lg overflow-hidden relative bg-white"
        style={{ border: `2px solid ${BRAND.orange}` }}
      >
        {/* Corner accent lines */}
        <div className="absolute top-2 left-2 w-3 h-3 border-l border-t" style={{ borderColor: BRAND.cyan }} />
        <div className="absolute top-2 right-2 w-3 h-3 border-r border-t" style={{ borderColor: BRAND.cyan }} />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-l border-b" style={{ borderColor: BRAND.cyan }} />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b" style={{ borderColor: BRAND.cyan }} />
        
        <div className="h-full flex flex-col items-center justify-center p-3 text-center">
          {companyLogo ? (
            <img src={companyLogo} alt="Logo" className="h-4 max-w-[50px] object-contain mb-1" />
          ) : (
            <p className="text-[10px] font-bold mb-1">
              <span style={{ color: BRAND.orange }}>inte</span>
              <span style={{ color: BRAND.cyan }}>grant</span>
            </p>
          )}
          <p className="text-[6px] text-gray-400 uppercase tracking-widest">Certificate</p>
          <p className="text-[9px] text-gray-600">of <span style={{ color: BRAND.cyan }}>Appreciation</span></p>
          <div className="my-1">
            <p className="text-[9px] font-bold text-gray-800">Employee Name</p>
          </div>
          <p className="text-[7px] font-medium" style={{ color: BRAND.orange }}>Top Performer</p>
        </div>
      </div>
    )
  }
  
  // Minimal style - very clean
  if (design === 'minimal') {
    return (
      <div className="aspect-[1.414/1] rounded-lg overflow-hidden relative bg-gray-50 border border-gray-200">
        <div className="h-full flex flex-col items-center justify-center p-3 text-center">
          <div className="w-6 h-0.5 mb-1.5 rounded" style={{ backgroundColor: BRAND.orange }} />
          {companyLogo && (
            <img src={companyLogo} alt="Logo" className="h-3 max-w-[40px] object-contain mb-1" />
          )}
          <p className="text-[7px] text-gray-400 uppercase tracking-wider">Certificate of Recognition</p>
          <div className="my-2">
            <p className="text-[10px] font-semibold text-gray-800">Employee Name</p>
            <div className="w-12 h-px bg-gray-300 mx-auto mt-0.5" />
          </div>
          <p className="text-[8px] font-medium" style={{ color: BRAND.cyan }}>Top Performer</p>
          <div className="w-6 h-0.5 mt-1.5 rounded" style={{ backgroundColor: BRAND.cyan }} />
        </div>
      </div>
    )
  }
  
  // Default fallback
  return (
    <div 
      className="aspect-[1.414/1] rounded-lg overflow-hidden relative"
      style={{ backgroundColor: BRAND.cream, border: `3px solid ${BRAND.orange}` }}
    >
      <div className="h-full flex flex-col items-center justify-center p-3 text-center">
        <Award className="w-5 h-5 mb-1" style={{ color: BRAND.cyan }} />
        <p className="text-[9px] font-bold text-gray-800">Certificate</p>
        <p className="text-[7px] text-gray-500">of Recognition</p>
      </div>
    </div>
  )
}

// Map template names to design styles
const getDesignStyle = (templateName) => {
  const name = templateName.toLowerCase()
  if (name.includes('classic') || name.includes('gold')) return 'classic'
  if (name.includes('modern') || name.includes('blue')) return 'modern'
  if (name.includes('elegant') || name.includes('executive') || name.includes('purple')) return 'elegant'
  if (name.includes('minimal') || name.includes('integrant')) return 'minimal'
  return 'classic'
}

export default function Templates() {
  const queryClient = useQueryClient()

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesAPI.getAll().then(r => r.data),
  })

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getAll().then(r => r.data),
  })

  const companyLogo = settings?.company_logo

  const setDefaultMutation = useMutation({
    mutationFn: ({ id }) => templatesAPI.update(id, { is_default: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates'])
      toast.success('Default template updated')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificate Templates"
        description="Choose from beautifully designed certificate templates"
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates?.map((template, index) => {
            const designStyle = getDesignStyle(template.name)
            
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  hover 
                  className={`relative overflow-hidden ${
                    template.is_default === 1 ? 'ring-2 ring-[#00B8E6]' : ''
                  }`}
                >
                  {template.is_default === 1 && (
                    <div className="absolute top-4 right-4 z-10">
                      <Badge color="cyan">
                        <Star className="w-3 h-3 mr-1" />
                        Default
                      </Badge>
                    </div>
                  )}

                  {/* Template Preview */}
                  <div className="mb-4">
                    <TemplatePreview template={template} design={designStyle} companyLogo={companyLogo} />
                  </div>

                  {/* Template Info */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{template.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                    </div>

                    {/* Theme colors indicator */}
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: BRAND.orange }}
                      />
                      <div 
                        className="w-5 h-5 rounded-full border-2 border-white shadow-sm -ml-2"
                        style={{ backgroundColor: BRAND.cyan }}
                      />
                      <span className="text-xs text-gray-500 ml-1">
                        Integrant Brand
                      </span>
                    </div>

                    {/* Set as Default Button */}
                    {template.is_default !== 1 && (
                      <button
                        onClick={() => setDefaultMutation.mutate({ id: template.id })}
                        className="w-full py-2 rounded-lg bg-gray-100 hover:bg-cyan-50 text-sm font-medium text-gray-700 hover:text-[#00B8E6] transition-colors flex items-center justify-center gap-2"
                      >
                        <Star className="w-4 h-4" />
                        Set as Default
                      </button>
                    )}
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Template Features Info */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Template Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${BRAND.cyan}20` }}>
              <Check className="w-4 h-4" style={{ color: BRAND.cyan }} />
            </div>
            <div>
              <p className="font-medium text-gray-800">Professional Design</p>
              <p className="text-gray-500">Carefully crafted layouts that look great printed or digital</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${BRAND.orange}20` }}>
              <Check className="w-4 h-4" style={{ color: BRAND.orange }} />
            </div>
            <div>
              <p className="font-medium text-gray-800">Auto-Generated PDF</p>
              <p className="text-gray-500">High-quality PDF generation ready for print or email</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${BRAND.cyan}20` }}>
              <Check className="w-4 h-4" style={{ color: BRAND.cyan }} />
            </div>
            <div>
              <p className="font-medium text-gray-800">Company Logo</p>
              <p className="text-gray-500">Your company logo is automatically included from settings</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
