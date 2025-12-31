import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Mail,
  Edit2,
  Eye,
  Send,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Loader2,
  Code,
  FileText,
  Settings,
  CheckCircle,
  XCircle
} from 'lucide-react'

const EmailTemplatesManagement = () => {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [testEmailModal, setTestEmailModal] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [smtpStatus, setSmtpStatus] = useState(null)
  const [verifyingSmtp, setVerifyingSmtp] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const [editForm, setEditForm] = useState({
    name: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    isActive: true,
    description: ''
  })

  const API_URL = '/api/admin/email-templates'

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  })

  useEffect(() => {
    fetchTemplates()
    verifySmtp()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const res = await axios.get(API_URL, getAuthHeaders())
      if (res.data.success) {
        setTemplates(res.data.data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      showMessage('error', 'Failed to fetch email templates')
    } finally {
      setLoading(false)
    }
  }

  const verifySmtp = async () => {
    try {
      setVerifyingSmtp(true)
      const res = await axios.post(`${API_URL}/verify-smtp`, {}, getAuthHeaders())
      setSmtpStatus(res.data.success ? 'connected' : 'error')
    } catch (error) {
      setSmtpStatus('error')
    } finally {
      setVerifyingSmtp(false)
    }
  }

  const seedTemplates = async () => {
    try {
      setLoading(true)
      const res = await axios.post(`${API_URL}/seed`, {}, getAuthHeaders())
      if (res.data.success) {
        showMessage('success', 'Templates seeded successfully')
        fetchTemplates()
      }
    } catch (error) {
      showMessage('error', 'Failed to seed templates')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (template) => {
    setSelectedTemplate(template)
    setEditForm({
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || '',
      isActive: template.isActive,
      description: template.description || ''
    })
    setEditMode(true)
    setPreviewMode(false)
  }

  const handlePreview = (template) => {
    setSelectedTemplate(template)
    setPreviewMode(true)
    setEditMode(false)
  }

  const handleSave = async () => {
    if (!selectedTemplate) return

    try {
      setSaving(true)
      const res = await axios.put(
        `${API_URL}/${selectedTemplate._id}`,
        editForm,
        getAuthHeaders()
      )
      if (res.data.success) {
        showMessage('success', 'Template saved successfully')
        fetchTemplates()
        setEditMode(false)
        setSelectedTemplate(null)
      }
    } catch (error) {
      showMessage('error', 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (template) => {
    try {
      const res = await axios.put(
        `${API_URL}/${template._id}`,
        { ...template, isActive: !template.isActive },
        getAuthHeaders()
      )
      if (res.data.success) {
        showMessage('success', `Template ${!template.isActive ? 'enabled' : 'disabled'} successfully`)
        fetchTemplates()
      }
    } catch (error) {
      showMessage('error', 'Failed to update template status')
    }
  }

  const handleSendTest = async () => {
    if (!testEmail || !selectedTemplate) return

    try {
      setSendingTest(true)
      const res = await axios.post(
        `${API_URL}/test`,
        { templateId: selectedTemplate._id, email: testEmail },
        getAuthHeaders()
      )
      if (res.data.success) {
        showMessage('success', 'Test email sent successfully')
        setTestEmailModal(false)
        setTestEmail('')
      }
    } catch (error) {
      showMessage('error', error.response?.data?.message || 'Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  const getTemplateIcon = (slug) => {
    const icons = {
      email_verification: '✉️',
      deposit_success: '💰',
      deposit_pending: '⏳',
      withdrawal_success: '💸',
      withdrawal_pending: '🔄',
      withdrawal_rejected: '❌',
      account_banned: '🚫',
      account_unbanned: '✅',
      password_reset: '🔑',
      welcome: '🎉'
    }
    return icons[slug] || '📧'
  }

  const getTemplateColor = (slug) => {
    const colors = {
      email_verification: 'bg-blue-500/20 text-blue-400',
      deposit_success: 'bg-green-500/20 text-green-400',
      deposit_pending: 'bg-yellow-500/20 text-yellow-400',
      withdrawal_success: 'bg-green-500/20 text-green-400',
      withdrawal_pending: 'bg-blue-500/20 text-blue-400',
      withdrawal_rejected: 'bg-red-500/20 text-red-400',
      account_banned: 'bg-red-500/20 text-red-400',
      account_unbanned: 'bg-green-500/20 text-green-400',
      password_reset: 'bg-purple-500/20 text-purple-400',
      welcome: 'bg-pink-500/20 text-pink-400'
    }
    return colors[slug] || 'bg-gray-500/20 text-gray-400'
  }

  // Parse preview with sample data
  const getPreviewHtml = (template) => {
    if (!template) return ''
    let html = template.htmlContent
    const sampleData = {
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      email: 'john@example.com',
      verificationUrl: 'https://NalmiFx.com/verify?token=sample123',
      verificationToken: 'sample123',
      amount: '500.00',
      currency: 'USD',
      transactionId: 'TXN123456789',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      balance: '1,500.00',
      rejectionReason: 'Insufficient documentation',
      reason: 'Terms of service violation',
      siteName: 'NalmiFx',
      supportEmail: 'support@NalmiFx.com'
    }
    Object.keys(sampleData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      html = html.replace(regex, sampleData[key])
    })
    return html
  }

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Email Templates
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage email templates for verification, deposits, withdrawals, and account notifications
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* SMTP Status */}
          <div 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              smtpStatus === 'connected' ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}
          >
            {verifyingSmtp ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : smtpStatus === 'connected' ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm font-medium ${smtpStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
              SMTP {smtpStatus === 'connected' ? 'Connected' : 'Error'}
            </span>
          </div>
          <button
            onClick={verifySmtp}
            disabled={verifyingSmtp}
            className="p-2 rounded-xl transition-colors"
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}
            title="Verify SMTP Connection"
          >
            <RefreshCw className={`w-5 h-5 ${verifyingSmtp ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={seedTemplates}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Seed Templates
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template._id}
            className="rounded-xl p-4 transition-all hover:shadow-lg"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${getTemplateColor(template.slug)}`}>
                  {getTemplateIcon(template.slug)}
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {template.name}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {template.slug}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                template.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {template.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
              {template.description || template.subject}
            </p>

            <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              <Code className="w-3 h-3" />
              {template.variables?.length || 0} variables
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePreview(template)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => handleEdit(template)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {template.isActive ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  onClick={() => handleToggleActive(template)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    template.isActive ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <span 
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      template.isActive ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && !loading && (
        <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
          <Mail className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No Email Templates
          </h3>
          <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
            Click "Seed Templates" to create default email templates
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {editMode && selectedTemplate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div 
            className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${getTemplateColor(selectedTemplate.slug)}`}>
                  {getTemplateIcon(selectedTemplate.slug)}
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    Edit Template: {selectedTemplate.name}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {selectedTemplate.slug}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedTemplate(selectedTemplate)
                    setTestEmailModal(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl transition-colors"
                  style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                >
                  <Send className="w-4 h-4" />
                  Send Test
                </button>
                <button
                  onClick={() => {
                    setEditMode(false)
                    setSelectedTemplate(null)
                  }}
                  className="p-2 rounded-xl transition-colors hover:bg-red-500/20"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={editForm.subject}
                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Variables Reference */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Available Variables
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.variables?.map((variable) => (
                    <code
                      key={variable}
                      className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 cursor-pointer hover:bg-blue-500/30"
                      onClick={() => {
                        navigator.clipboard.writeText(`{{${variable}}}`)
                        showMessage('success', `Copied {{${variable}}} to clipboard`)
                      }}
                    >
                      {`{{${variable}}}`}
                    </code>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  HTML Content
                </label>
                <textarea
                  value={editForm.htmlContent}
                  onChange={(e) => setEditForm({ ...editForm, htmlContent: e.target.value })}
                  rows={15}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>Template Active</span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={() => {
                  setEditMode(false)
                  setSelectedTemplate(null)
                }}
                className="px-6 py-2 rounded-xl transition-colors"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewMode && selectedTemplate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div 
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl flex flex-col"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${getTemplateColor(selectedTemplate.slug)}`}>
                  {getTemplateIcon(selectedTemplate.slug)}
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    Preview: {selectedTemplate.name}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Subject: {selectedTemplate.subject.replace(/{{siteName}}/g, 'NalmiFx')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(selectedTemplate)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setPreviewMode(false)
                    setSelectedTemplate(null)
                  }}
                  className="p-2 rounded-xl transition-colors hover:bg-red-500/20"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto bg-gray-100">
              <iframe
                srcDoc={getPreviewHtml(selectedTemplate)}
                className="w-full h-full min-h-[500px]"
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {testEmailModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div 
            className="w-full max-w-md rounded-2xl p-6"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Send Test Email
              </h3>
              <button
                onClick={() => {
                  setTestEmailModal(false)
                  setTestEmail('')
                }}
                className="p-2 rounded-xl transition-colors hover:bg-red-500/20"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Recipient Email
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>

            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              A test email will be sent using the "{selectedTemplate.name}" template with sample data.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setTestEmailModal(false)
                  setTestEmail('')
                }}
                className="flex-1 py-3 rounded-xl transition-colors"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                disabled={sendingTest || !testEmail}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailTemplatesManagement
