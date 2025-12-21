import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, Reorder } from 'framer-motion'
import { 
  Trophy, 
  Plus, 
  Edit2, 
  Trash2,
  GripVertical,
  Star,
  Award,
  TrendingUp,
  Zap
} from 'lucide-react'
import { tiersAPI } from '../services/api'
import { PageHeader, Card, Button, Input, Textarea, Modal, Spinner, Badge } from '../components/UI'
import toast from 'react-hot-toast'

const iconOptions = [
  { value: 'trophy', icon: Trophy, label: 'Trophy' },
  { value: 'star', icon: Star, label: 'Star' },
  { value: 'award', icon: Award, label: 'Award' },
  { value: 'trending-up', icon: TrendingUp, label: 'Trending' },
  { value: 'zap', icon: Zap, label: 'Zap' },
]

const colorOptions = [
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
]

export default function Tiers() {
  const [showModal, setShowModal] = useState(false)
  const [editingTier, setEditingTier] = useState(null)
  const queryClient = useQueryClient()

  const { data: tiers, isLoading } = useQuery({
    queryKey: ['tiers'],
    queryFn: () => tiersAPI.getAll().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: tiersAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['tiers'])
      setShowModal(false)
      toast.success('Tier created successfully')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => tiersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tiers'])
      setEditingTier(null)
      setShowModal(false)
      toast.success('Tier updated successfully')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: tiersAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['tiers'])
      toast.success('Tier deleted successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete tier')
    }
  })

  const reorderMutation = useMutation({
    mutationFn: tiersAPI.reorder,
    onSuccess: () => {
      queryClient.invalidateQueries(['tiers'])
    },
  })

  const handleReorder = (newOrder) => {
    reorderMutation.mutate(newOrder)
  }

  const handleEdit = (tier) => {
    setEditingTier(tier)
    setShowModal(true)
  }

  const handleDelete = (tier) => {
    if (confirm(`Are you sure you want to delete "${tier.name}"?`)) {
      deleteMutation.mutate(tier.id)
    }
  }

  const getIconComponent = (iconName) => {
    const iconOption = iconOptions.find(i => i.value === iconName)
    return iconOption?.icon || Trophy
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Tiers"
        description="Configure recognition levels for your organization"
        actions={
          <Button onClick={() => { setEditingTier(null); setShowModal(true) }}>
            <Plus className="w-4 h-4" />
            Add Tier
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <Card>
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
            <GripVertical className="w-4 h-4" />
            <span>Drag to reorder tiers by priority</span>
          </div>

          <Reorder.Group 
            axis="y" 
            values={tiers || []} 
            onReorder={handleReorder}
            className="space-y-3"
          >
            {tiers?.map((tier, index) => {
              const IconComponent = getIconComponent(tier.icon)
              return (
                <Reorder.Item
                  key={tier.id}
                  value={tier}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-purple-200 bg-white transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-2 text-gray-400">
                      <GripVertical className="w-5 h-5" />
                      <span className="text-sm font-medium w-6 text-center text-gray-500">#{index + 1}</span>
                    </div>

                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${tier.color}15` }}
                    >
                      <IconComponent className="w-6 h-6" style={{ color: tier.color }} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold" style={{ color: tier.color }}>
                          {tier.name}
                        </h3>
                        <div 
                          className="w-4 h-4 rounded-full shadow-sm"
                          style={{ backgroundColor: tier.color }}
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{tier.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(tier)}
                        className="p-2 rounded-lg hover:bg-purple-50 text-gray-500 hover:text-purple-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tier)}
                        className="p-2 rounded-lg hover:bg-rose-50 text-gray-500 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                </Reorder.Item>
              )
            })}
          </Reorder.Group>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <TierModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingTier(null) }}
        tier={editingTier}
        onSubmit={(data) => {
          if (editingTier) {
            updateMutation.mutate({ id: editingTier.id, data })
          } else {
            createMutation.mutate(data)
          }
        }}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  )
}

function TierModal({ isOpen, onClose, tier, onSubmit, loading }) {
  const [formData, setFormData] = useState({
    name: tier?.name || '',
    description: tier?.description || '',
    color: tier?.color || '#8B5CF6',
    icon: tier?.icon || 'trophy'
  })

  // Reset form when tier changes
  useState(() => {
    setFormData({
      name: tier?.name || '',
      description: tier?.description || '',
      color: tier?.color || '#8B5CF6',
      icon: tier?.icon || 'trophy'
    })
  }, [tier])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tier ? 'Edit Tier' : 'Add New Tier'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Tier Name"
          placeholder="e.g., Top Performer"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <Textarea
          label="Description"
          placeholder="Describe what this tier represents..."
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Color
          </label>
          <div className="flex gap-2">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData({ ...formData, color })}
                className={`w-8 h-8 rounded-full transition-transform shadow-sm ${
                  formData.color === color ? 'ring-2 ring-gray-400 ring-offset-2 scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Icon
          </label>
          <div className="flex gap-2">
            {iconOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData({ ...formData, icon: option.value })}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  formData.icon === option.value
                    ? 'bg-purple-100 text-purple-600 ring-2 ring-purple-500'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={option.label}
              >
                <option.icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Preview
          </label>
          <div className="p-4 rounded-xl bg-gray-50 flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${formData.color}15` }}
            >
              {(() => {
                const IconComponent = iconOptions.find(i => i.value === formData.icon)?.icon || Trophy
                return <IconComponent className="w-6 h-6" style={{ color: formData.color }} />
              })()}
            </div>
            <div>
              <p className="font-semibold" style={{ color: formData.color }}>
                {formData.name || 'Tier Name'}
              </p>
              <p className="text-sm text-gray-500">
                {formData.description || 'Tier description'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {tier ? 'Update' : 'Create'} Tier
          </Button>
        </div>
      </form>
    </Modal>
  )
}
