import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Award, 
  Users, 
  Trophy, 
  Send,
  TrendingUp,
  Clock,
  ArrowRight
} from 'lucide-react'
import { certificatesAPI, tiersAPI } from '../services/api'
import { PageHeader, StatCard, Card, Button, Spinner } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format } from 'date-fns'

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['certificateStats'],
    queryFn: () => certificatesAPI.getStats().then(r => r.data),
  })

  const { data: tiers } = useQuery({
    queryKey: ['tiers'],
    queryFn: () => tiersAPI.getAll().then(r => r.data),
  })

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  const chartData = stats?.certificatesByTier?.map(tier => ({
    name: tier.name,
    count: tier.count,
    color: tier.color,
  })) || []

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your appreciation program"
        actions={
          <Link to="/send">
            <Button>
              <Send className="w-4 h-4" />
              Send Certificate
            </Button>
          </Link>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Award}
          label="Total Certificates"
          value={stats?.totalCertificates || 0}
          color="orange"
        />
        <StatCard
          icon={Users}
          label="Total Employees"
          value={stats?.totalEmployees || 0}
          color="cyan"
        />
        <StatCard
          icon={Trophy}
          label="Performance Tiers"
          value={tiers?.length || 0}
          color="amber"
        />
        <StatCard
          icon={TrendingUp}
          label="This Month"
          value={stats?.recentCertificates?.length || 0}
          color="emerald"
        />
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certificates by Tier Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Certificates by Tier</h3>
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" stroke="#9CA3AF" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#9CA3AF"
                    width={120}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    }}
                    labelStyle={{ color: '#1F2937' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No certificates yet
            </div>
          )}
        </Card>

        {/* Recent Certificates */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Certificates</h3>
            <Link to="/certificates" className="text-sm text-[#00B8E6] hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {stats?.recentCertificates?.length > 0 ? (
            <div className="space-y-3">
              {stats.recentCertificates.map((cert, index) => (
                <motion.div
                  key={cert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${cert.tier_color}15` }}
                  >
                    <Award className="w-5 h-5" style={{ color: cert.tier_color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{cert.employee_name}</p>
                    <p className="text-sm text-gray-500">{cert.tier_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(cert.created_at), 'MMM d')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Award className="w-12 h-12 mb-3 opacity-50" />
              <p>No certificates sent yet</p>
              <Link to="/send" className="mt-2 text-[#00B8E6] hover:underline text-sm">
                Send your first certificate
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/send">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-5 rounded-lg bg-orange-50 border border-orange-100 cursor-pointer hover:bg-orange-100 transition-colors"
            >
              <Send className="w-8 h-8 text-[#F7941D] mb-3" />
              <h4 className="font-medium text-gray-900">Send Certificate</h4>
              <p className="text-sm text-gray-500 mt-1">Recognize an employee</p>
            </motion.div>
          </Link>
          <Link to="/bulk-send">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-5 rounded-lg bg-cyan-50 border border-cyan-100 cursor-pointer hover:bg-cyan-100 transition-colors"
            >
              <Users className="w-8 h-8 text-[#00B8E6] mb-3" />
              <h4 className="font-medium text-gray-900">Bulk Send</h4>
              <p className="text-sm text-gray-500 mt-1">Send to multiple employees</p>
            </motion.div>
          </Link>
          <Link to="/employees">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-5 rounded-lg bg-emerald-50 border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors"
            >
              <Users className="w-8 h-8 text-emerald-500 mb-3" />
              <h4 className="font-medium text-gray-900">Manage Employees</h4>
              <p className="text-sm text-gray-500 mt-1">Add or import employees</p>
            </motion.div>
          </Link>
          <Link to="/tiers">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-5 rounded-lg bg-amber-50 border border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <Trophy className="w-8 h-8 text-amber-500 mb-3" />
              <h4 className="font-medium text-gray-900">Configure Tiers</h4>
              <p className="text-sm text-gray-500 mt-1">Customize performance levels</p>
            </motion.div>
          </Link>
        </div>
      </Card>
    </div>
  )
}
