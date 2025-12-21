import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Award, 
  Search, 
  Eye, 
  Download, 
  Mail, 
  Trash2,
  Send,
  Filter,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { certificatesAPI, tiersAPI } from '../services/api'
import { PageHeader, Card, Button, Modal, EmptyState, Badge, Spinner, Select, Pagination } from '../components/UI'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function Certificates() {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [viewingCert, setViewingCert] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  
  const queryClient = useQueryClient()

  const { data: certificates, isLoading } = useQuery({
    queryKey: ['certificates', tierFilter],
    queryFn: () => certificatesAPI.getAll({ tier_id: tierFilter || undefined }).then(r => r.data),
    refetchOnMount: 'always', // Always fetch fresh data when navigating to this page
  })

  const { data: tiers } = useQuery({
    queryKey: ['tiers'],
    queryFn: () => tiersAPI.getAll().then(r => r.data),
  })

  const resendMutation = useMutation({
    mutationFn: certificatesAPI.resend,
    onSuccess: () => {
      queryClient.invalidateQueries(['certificates'])
      toast.success('Email sent successfully')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: certificatesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['certificates'])
      toast.success('Certificate deleted')
    },
  })

  const filteredCertificates = certificates?.filter(cert => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      cert.employee_name.toLowerCase().includes(searchLower) ||
      cert.tier_name.toLowerCase().includes(searchLower) ||
      cert.certificate_id.toLowerCase().includes(searchLower)
    )
  })
  
  // Reset to page 1 when search changes
  const handleSearchChange = (value) => {
    setSearch(value)
    setCurrentPage(1)
  }
  
  const handleTierFilterChange = (value) => {
    setTierFilter(value)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificates"
        description="View and manage sent certificates"
        actions={
          <Link to="/send">
            <Button>
              <Send className="w-4 h-4" />
              Send Certificate
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee name or certificate ID..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6] transition-all"
            />
          </div>
          <div className="w-full md:w-64">
            <Select
              value={tierFilter}
              onChange={(e) => handleTierFilterChange(e.target.value)}
              options={tiers?.map(t => ({ value: t.id.toString(), label: t.name })) || []}
              placeholder="All Tiers"
            />
          </div>
        </div>
      </Card>

      {/* Certificates List */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        ) : filteredCertificates?.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No certificates found"
            description="Start recognizing your top performers"
            action={
              <Link to="/send">
                <Button>
                  <Send className="w-4 h-4" />
                  Send Certificate
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Certificate</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Employee</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Tier</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Email Status</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCertificates?.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((cert, index) => (
                    <motion.tr
                      key={cert.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-gray-50 table-row-hover"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${cert.tier_color}15` }}
                          >
                            <Award className="w-5 h-5" style={{ color: cert.tier_color }} />
                          </div>
                          <div>
                            <p className="font-mono text-sm text-gray-500">
                              {cert.certificate_id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-gray-800">{cert.employee_name}</p>
                          <p className="text-sm text-gray-500">{cert.employee_email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge 
                          style={{ 
                            backgroundColor: `${cert.tier_color}15`,
                            color: cert.tier_color,
                            borderColor: `${cert.tier_color}30`
                          }}
                        >
                          {cert.tier_name}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        {cert.email_sent ? (
                          <div className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Sent</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400">
                            <XCircle className="w-4 h-4" />
                            <span className="text-sm">Not sent</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">
                            {format(new Date(cert.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingCert(cert)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {cert.pdf_path && (
                            <a
                              href={cert.pdf_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => resendMutation.mutate(cert.id)}
                            className="p-2 rounded-lg hover:bg-cyan-50 text-gray-500 hover:text-[#00B8E6] transition-colors"
                            title="Resend Email"
                            disabled={resendMutation.isPending}
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this certificate?')) {
                                deleteMutation.mutate(cert.id)
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-rose-50 text-gray-500 hover:text-rose-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="px-6">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredCertificates?.length || 0}
                pageSize={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setCurrentPage(1)
                }}
              />
            </div>
          </>
        )}
      </Card>

      {/* Certificate Detail Modal */}
      <Modal
        isOpen={!!viewingCert}
        onClose={() => setViewingCert(null)}
        title="Certificate Details"
        size="lg"
      >
        {viewingCert && (
          <div className="space-y-6">
            {/* Certificate Preview - Classic Style with Integrant Colors */}
            <div 
              className="aspect-[1.414/1] rounded-lg overflow-hidden relative shadow-lg"
              style={{ backgroundColor: '#FDF8F3', border: '5px solid #F7941D' }}
            >
              {/* Inner border (cyan) */}
              <div 
                className="absolute inset-3 border pointer-events-none"
                style={{ borderColor: '#00B8E6' }}
              />
              
              <div className="relative h-full flex flex-col items-center justify-between text-center py-6 px-8">
                {/* Header */}
                <div>
                  <h2 className="text-2xl font-bold tracking-wide" style={{ color: '#F7941D' }}>
                    CERTIFICATE OF RECOGNITION
                  </h2>
                  <div className="flex items-center justify-center gap-1 my-2">
                    <div className="w-24 h-[2px]" style={{ backgroundColor: '#F7941D' }} />
                    <div className="w-16 h-[1px]" style={{ backgroundColor: '#00B8E6' }} />
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col justify-center">
                  <p className="text-sm text-gray-500 italic mb-2">This certifies that</p>
                  <p className="text-3xl font-bold text-gray-800 mb-2">{viewingCert.employee_name}</p>
                  <div className="w-48 h-px mx-auto mb-3" style={{ backgroundColor: '#F7941D' }} />
                  <p className="text-sm text-gray-500 italic mb-2">has been recognized as</p>
                  <p 
                    className="text-2xl font-bold uppercase"
                    style={{ color: viewingCert.tier_color || '#00B8E6' }}
                  >
                    {viewingCert.tier_name}
                  </p>
                  {viewingCert.period && (
                    <p className="text-sm text-gray-400 mt-2">for {viewingCert.period}</p>
                  )}
                  {viewingCert.achievement_description && (
                    <p className="text-sm text-gray-600 mt-3 italic max-w-md mx-auto">
                      "{viewingCert.achievement_description}"
                    </p>
                  )}
                </div>

                {/* Footer - Date and Signature */}
                <div className="w-full flex justify-between items-end px-8">
                  <div className="text-center">
                    <p className="text-sm text-gray-700 mb-1">{format(new Date(viewingCert.created_at), 'MMMM d, yyyy')}</p>
                    <div className="w-32 h-px bg-gray-400" />
                    <p className="text-xs text-gray-400 mt-1">Date</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-700">{viewingCert.sender_name}</p>
                    <div className="w-32 h-px bg-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Certificate ID</p>
                <p className="font-mono text-gray-800">{viewingCert.certificate_id}</p>
              </div>
              <div>
                <p className="text-gray-500">Employee Email</p>
                <p className="text-gray-800">{viewingCert.employee_email}</p>
              </div>
              <div>
                <p className="text-gray-500">Sent By</p>
                <p className="text-gray-800">{viewingCert.sender_name}</p>
              </div>
              <div>
                <p className="text-gray-500">Email Status</p>
                <p className={viewingCert.email_sent ? 'text-emerald-600' : 'text-gray-400'}>
                  {viewingCert.email_sent ? 'Sent' : 'Not sent'}
                </p>
              </div>
            </div>

            {viewingCert.custom_message && (
              <div>
                <p className="text-gray-500 text-sm mb-1">Custom Message</p>
                <p className="text-gray-700 p-3 rounded-lg bg-gray-50 text-sm">
                  {viewingCert.custom_message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              {viewingCert.pdf_path && (
                <a href={viewingCert.pdf_path} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary">
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                </a>
              )}
              <Button 
                onClick={() => {
                  resendMutation.mutate(viewingCert.id)
                  setViewingCert(null)
                }}
              >
                <Mail className="w-4 h-4" />
                Resend Email
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
