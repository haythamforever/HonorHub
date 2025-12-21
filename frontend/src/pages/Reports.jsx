import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  Users, 
  Award, 
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  X,
  Calendar
} from 'lucide-react'
import { reportsAPI } from '../services/api'
import { PageHeader, Card, Button, Spinner, Badge, Modal, Pagination } from '../components/UI'
import { format } from 'date-fns'

// Brand colors
const BRAND = {
  orange: '#F7941D',
  cyan: '#00B8E6',
}

export default function Reports() {
  const [filterAccount, setFilterAccount] = useState('')
  const [filterManager, setFilterManager] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Get filter options
  const { data: filters } = useQuery({
    queryKey: ['report-filters'],
    queryFn: () => reportsAPI.getFilters().then(r => r.data),
  })

  // Get summary data
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['report-summary', filterAccount, filterManager, filterYear],
    queryFn: () => reportsAPI.getSummary({ 
      account: filterAccount || undefined,
      manager: filterManager || undefined,
      year: filterYear || undefined
    }).then(r => r.data),
  })

  // Get employee recognitions
  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employee-recognitions', filterAccount, filterManager, filterYear],
    queryFn: () => reportsAPI.getEmployeeRecognitions({
      account: filterAccount || undefined,
      manager: filterManager || undefined,
      year: filterYear || undefined
    }).then(r => r.data),
  })

  // Get selected employee detail
  const { data: employeeDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['employee-detail', selectedEmployee?.employee_id],
    queryFn: () => reportsAPI.getEmployeeDetail(selectedEmployee.employee_id).then(r => r.data),
    enabled: !!selectedEmployee,
  })

  const clearFilters = () => {
    setFilterAccount('')
    setFilterManager('')
    setFilterYear('')
    setCurrentPage(1)
  }
  
  // Reset page when filters change
  const handleFilterChange = (setter) => (value) => {
    setter(value)
    setCurrentPage(1)
  }

  const hasFilters = filterAccount || filterManager || filterYear

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recognition Reports"
        description="View employee recognition statistics and analytics"
        actions={
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasFilters && <Badge color="orange" className="ml-2">{[filterAccount, filterManager, filterYear].filter(Boolean).length}</Badge>}
          </Button>
        }
      />

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Filter Reports</h3>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                <select
                  value={filterAccount}
                  onChange={(e) => handleFilterChange(setFilterAccount)(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6]"
                >
                  <option value="">All Accounts</option>
                  {filters?.accounts?.map(acc => (
                    <option key={acc} value={acc}>{acc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                <select
                  value={filterManager}
                  onChange={(e) => handleFilterChange(setFilterManager)(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6]"
                >
                  <option value="">All Managers</option>
                  {filters?.managers?.map(mgr => (
                    <option key={mgr} value={mgr}>{mgr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={filterYear}
                  onChange={(e) => handleFilterChange(setFilterYear)(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6]"
                >
                  <option value="">All Years</option>
                  {filters?.years?.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Summary Stats */}
      {loadingSummary ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${BRAND.orange}20` }}>
                <Award className="w-6 h-6" style={{ color: BRAND.orange }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summary?.totalRecognitions || 0}</p>
                <p className="text-sm text-gray-500">Total Recognitions</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${BRAND.cyan}20` }}>
                <Users className="w-6 h-6" style={{ color: BRAND.cyan }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summary?.uniqueEmployees || 0}</p>
                <p className="text-sm text-gray-500">Employees Recognized</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {summary?.uniqueEmployees && summary?.totalRecognitions 
                    ? (summary.totalRecognitions / summary.uniqueEmployees).toFixed(1)
                    : '0'}
                </p>
                <p className="text-sm text-gray-500">Avg per Employee</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summary?.byTier?.length || 0}</p>
                <p className="text-sm text-gray-500">Tier Types Used</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Tier */}
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Recognitions by Tier</h3>
          {summary?.byTier?.length > 0 ? (
            <div className="space-y-3">
              {summary.byTier.map((tier) => {
                const maxCount = Math.max(...summary.byTier.map(t => t.count))
                const percentage = maxCount > 0 ? (tier.count / maxCount) * 100 : 0
                return (
                  <div key={tier.name} className="flex items-center gap-3">
                    <div className="w-28 text-sm font-medium truncate" style={{ color: tier.color }}>
                      {tier.name}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full rounded-full flex items-center justify-end px-2"
                        style={{ backgroundColor: tier.color }}
                      >
                        <span className="text-xs font-medium text-white">{tier.count}</span>
                      </motion.div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No data available</p>
          )}
        </Card>

        {/* By Account */}
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Recognitions by Account</h3>
          {summary?.byAccount?.length > 0 ? (
            <div className="space-y-3">
              {summary.byAccount.slice(0, 6).map((acc, index) => {
                const maxCount = summary.byAccount[0]?.count || 1
                const percentage = (acc.count / maxCount) * 100
                return (
                  <div key={acc.account} className="flex items-center gap-3">
                    <div className="w-28 text-sm font-medium truncate text-gray-700">
                      {acc.account || 'N/A'}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="h-full rounded-full flex items-center justify-end px-2"
                        style={{ backgroundColor: index % 2 === 0 ? BRAND.orange : BRAND.cyan }}
                      >
                        <span className="text-xs font-medium text-white">{acc.count}</span>
                      </motion.div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No data available</p>
          )}
        </Card>
      </div>

      {/* Top Employees */}
      <Card>
        <h3 className="font-semibold text-gray-800 mb-4">Top Recognized Employees</h3>
        {summary?.topEmployees?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {summary.topEmployees.map((emp, index) => (
              <motion.div
                key={emp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => setSelectedEmployee({ employee_id: emp.id, ...emp })}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: index < 3 ? BRAND.orange : BRAND.cyan }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{emp.name}</p>
                  <p className="text-xs text-gray-500">{emp.recognition_count} recognitions</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No data available</p>
        )}
      </Card>

      {/* Employee List */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">All Employee Recognitions</h3>
          <p className="text-sm text-gray-500">{employees?.length || 0} employees</p>
        </div>

        {loadingEmployees ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : employees?.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Employee</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Account</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Manager</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Total</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tiers Received</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((emp, index) => (
                    <motion.tr
                      key={emp.employee_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                            style={{ backgroundColor: BRAND.cyan }}
                          >
                            {emp.employee_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{emp.employee_name}</p>
                            <p className="text-xs text-gray-500">{emp.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{emp.account || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{emp.manager_name || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge color={emp.total_recognitions > 0 ? 'orange' : 'gray'}>
                          {emp.total_recognitions}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {emp.tiers_received?.split(',').slice(0, 3).map((tier, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                              {tier.trim()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedEmployee(emp)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#00B8E6] transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <Pagination
              currentPage={currentPage}
              totalItems={employees.length}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
            />
          </>
        ) : (
          <p className="text-gray-400 text-center py-8">No employees found with recognitions</p>
        )}
      </Card>

      {/* Employee Detail Modal */}
      <Modal
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        title="Employee Recognition Details"
        size="lg"
      >
        {loadingDetail ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : employeeDetail ? (
          <div className="space-y-6">
            {/* Employee Info */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: BRAND.cyan }}
              >
                {employeeDetail.employee.name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{employeeDetail.employee.name}</h3>
                <p className="text-sm text-gray-500">{employeeDetail.employee.email}</p>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  {employeeDetail.employee.account && <span>Account: {employeeDetail.employee.account}</span>}
                  {employeeDetail.employee.department && <span>Dept: {employeeDetail.employee.department}</span>}
                </div>
              </div>
              <div className="ml-auto text-right">
                <p className="text-3xl font-bold" style={{ color: BRAND.orange }}>{employeeDetail.totalRecognitions}</p>
                <p className="text-sm text-gray-500">Total Recognitions</p>
              </div>
            </div>

            {/* Yearly Breakdown */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Yearly Breakdown</h4>
              {employeeDetail.yearlyBreakdown?.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {employeeDetail.yearlyBreakdown.map((year) => (
                    <div key={year.year} className="p-3 rounded-lg bg-gray-50 text-center">
                      <p className="text-2xl font-bold" style={{ color: BRAND.cyan }}>{year.count}</p>
                      <p className="text-sm text-gray-500">{year.year}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No yearly data</p>
              )}
            </div>

            {/* Tier Breakdown */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3">By Tier</h4>
              {employeeDetail.tierBreakdown?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {employeeDetail.tierBreakdown.map((tier) => (
                    <div 
                      key={tier.tier_name}
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: tier.tier_color }}
                    >
                      {tier.tier_name}: {tier.count}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No tier data</p>
              )}
            </div>

            {/* Recent Certificates */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Recognition History</h4>
              {employeeDetail.certificates?.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {employeeDetail.certificates.map((cert) => (
                    <div key={cert.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                      <Award className="w-5 h-5" style={{ color: cert.tier_color }} />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{cert.tier_name}</p>
                        <p className="text-xs text-gray-500">
                          {cert.period && `${cert.period} • `}
                          {format(new Date(cert.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400">by {cert.sent_by_name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No certificates</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

