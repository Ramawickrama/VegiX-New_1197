import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import Toast from '../components/Toast';
import './Profile.css';

const Profile = ({ user }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    location: '',
    company: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/profile');
      setProfile(response.data.profile);
      setFormData({
        name: response.data.profile.name || '',
        phone: response.data.profile.phone || '',
        location: response.data.profile.location || '',
        company: response.data.profile.company || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      showToast(t('errors.failedToLoad'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await api.put('/auth/profile', formData);
      setProfile((prev) => ({ ...prev, ...response.data.profile }));
      localStorage.setItem('user', JSON.stringify({ ...user, ...response.data.profile }));
      showToast(t('success.updated'), 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast(error.response?.data?.message || t('errors.failedToSave'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast(t('auth.passwordMismatch'), 'error');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showToast(t('auth.passwordTooShort'), 'error');
      return;
    }
    try {
      setSaving(true);
      await api.put('/auth/change-password', passwordData);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast(t('profile.passwordChanged'), 'success');
    } catch (error) {
      console.error('Error changing password:', error);
      showToast(error.response?.data?.message || t('errors.failedToSave'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="profile-header">
        <h1>{t('nav.profile')}</h1>
        <p>{t('profile.subtitle')}</p>
      </div>

      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          {t('profile.personalInfo')}
        </button>
        <button
          className={`profile-tab ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          {t('profile.changePassword')}
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="profile-card">
              <div className="profile-avatar">
                <div className="avatar-circle">
                  {profile?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>

              <div className="profile-info">
                <div className="info-row">
                  <span className="info-label">{t('common.name')}</span>
                  <span className="info-value">{profile?.name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{t('common.email')}</span>
                  <span className="info-value">{profile?.email}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{t('common.phone')}</span>
                  <span className="info-value">{profile?.phone}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{t('auth.userRole')}</span>
                  <span className={`role-badge ${profile?.role}`}>
                    {profile?.role?.toUpperCase()}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">{t('auth.location')}</span>
                  <span className="info-value">{profile?.location || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{t('auth.companyName')}</span>
                  <span className="info-value">{profile?.company || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{t('profile.userId')}</span>
                  <span className="info-value">
                    <code className="user-id-badge">{profile?.userId}</code>
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">{t('profile.memberSince')}</span>
                  <span className="info-value">
                    {profile?.registrationDate
                      ? new Date(profile.registrationDate).toLocaleDateString()
                      : '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="edit-form-card">
              <h2>{t('profile.editProfile')}</h2>
              <form onSubmit={handleProfileSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('common.name')} *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('common.phone')} *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('auth.location')}</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('auth.companyName')}</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? t('common.loading') : t('common.saveChanges')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="password-section">
            <div className="password-card">
              <h2>{t('profile.changePassword')}</h2>
              <p className="password-hint">{t('profile.passwordHint')}</p>
              <form onSubmit={handlePasswordSubmit}>
                <div className="form-group">
                  <label>{t('profile.currentPassword')} *</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('profile.newPassword')} *</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('profile.confirmNewPassword')} *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? t('common.loading') : t('profile.updatePassword')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
