import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import OrderCard from '../components/OrderCard';
import API from '../services/api';
import PageLayout from '../components/PageLayout';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { SkeletonCard } from '../components/Skeleton';
import '../styles/ViewOrders.css';

const BrokerViewFarmerOrders = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contactingFarmer, setContactingFarmer] = useState(null);
  const [addingToCart, setAddingToCart] = useState(null);
  const [deletingPost, setDeletingPost] = useState(null);
  const [vegetables, setVegetables] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Filter state
  const [filters, setFilters] = useState({
    vegetableId: '',
    district: '',
    nearCity: '',
    areaVillage: '',
    minKg: '',
    maxKg: '',
    minPrice: '',
    maxPrice: '',
    fromDate: '',
    toDate: '',
    status: ''
  });

  const navigate = useNavigate();
  const toast = useToast();

  // Fetch vegetables for dropdown
  const fetchVegetables = useCallback(async () => {
    try {
      const response = await API.get('/vegetables');
      if (response.data?.success) {
        setVegetables(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching vegetables:', error);
    }
  }, []);

  useEffect(() => {
    fetchVegetables();
    fetchPosts();
  }, [fetchVegetables]);

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        params.append(key, value.trim());
      }
    });
    return params.toString();
  }, [filters]);

  const fetchPosts = async (page = 1) => {
    try {
      setLoading(true);
      const queryParams = buildQueryParams();
      const pageParam = page > 1 ? `&page=${page}` : '';
      const response = await API.get(`/farmer/posts/all?${queryParams}${pageParam}`);
      setPosts(response.data.posts || []);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load farmer posts');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchPosts(1);
  };

  const handleClearFilters = () => {
    setFilters({
      vegetableId: '',
      district: '',
      nearCity: '',
      areaVillage: '',
      minKg: '',
      maxKg: '',
      minPrice: '',
      maxPrice: '',
      fromDate: '',
      toDate: '',
      status: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchPosts(1);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      fetchPosts(newPage);
    }
  };

  const handleChat = async (post) => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
      navigate('/login', { state: { from: '/broker/view-farmer-orders' } });
      return;
    }

    if (user.role !== 'broker') {
      toast.error('Only brokers can contact farmers');
      return;
    }

    setContactingFarmer(post._id);

    try {
      const response = await API.post(`/broker/farmer-orders/${post._id}/contact`);

      if (response.data.success) {
        const farmerEmail = response.data.otherUser.email;
        navigate(`/broker/messages?email=${encodeURIComponent(farmerEmail)}`);
      } else {
        toast.error(response.data.message || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Error contacting farmer:', error);
      toast.error(error.response?.data?.message || 'Failed to contact farmer');
    } finally {
      setContactingFarmer(null);
    }
  };

  const handleAddToCart = async (post) => {
    try {
      setAddingToCart(post._id);
      const response = await API.post(`/broker/cart/${post._id}`);
      
      if (response.data?.success) {
        toast.success('Added to cart!');
        navigate('/broker/cart');
      } else {
        toast.error(response.data?.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingPost(postId);
      const response = await API.delete(`/farmer/posts/${postId}/broker`);
      
      if (response.data?.success) {
        toast.success('Post deleted successfully');
        setPosts(posts.filter(post => post._id !== postId));
        setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      } else {
        toast.error(response.data?.message || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(error.response?.data?.message || 'Failed to delete post');
    } finally {
      setDeletingPost(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-open">In Stock</span>;
      case 'bought':
        return <span className="badge badge-bought">Bought</span>;
      case 'sold':
        return <span className="badge badge-completed">Sold</span>;
      default:
        return <span className="badge badge-pending">{status}</span>;
    }
  };

  const getAllLanguagesName = (post) => {
    const names = [];
    if (post.vegetableName) names.push(post.vegetableName);
    if (post.vegetableNameSi) names.push(post.vegetableNameSi);
    if (post.vegetableNameTa) names.push(post.vegetableNameTa);
    return names.join(' | ') || 'N/A';
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some(v => v && v.trim() !== '');
  };

  const FilterSection = () => (
    <div className="filter-section" style={{
      background: 'white',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔍 Filter Posts
          {hasActiveFilters() && (
            <span style={{
              background: '#e74c3c',
              color: 'white',
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: 'normal'
            }}>
              Active
            </span>
          )}
        </h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="filter-toggle-btn"
          style={{
            background: showFilters ? '#ecf0f1' : '#3498db',
            color: showFilters ? '#2c3e50' : 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          {showFilters ? '▲ Hide Filters' : '▼ Show Filters'}
        </button>
      </div>

      {showFilters && (
        <div className="filter-grid">
          <div className="filter-group">
            <label>Vegetable</label>
            <select
              value={filters.vegetableId}
              onChange={(e) => handleFilterChange('vegetableId', e.target.value)}
              className="filter-select"
            >
              <option value="">All Vegetables</option>
              {vegetables.map(veg => (
                <option key={veg._id} value={veg._id}>
                  {veg.name}
                  {veg.nameSi ? ` (${veg.nameSi})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>District</label>
            <input
              type="text"
              value={filters.district}
              onChange={(e) => handleFilterChange('district', e.target.value)}
              placeholder="e.g., Colombo"
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Near City</label>
            <input
              type="text"
              value={filters.nearCity}
              onChange={(e) => handleFilterChange('nearCity', e.target.value)}
              placeholder="e.g., Kandy"
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Area/Village</label>
            <input
              type="text"
              value={filters.areaVillage}
              onChange={(e) => handleFilterChange('areaVillage', e.target.value)}
              placeholder="e.g., Digana"
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Min Quantity (kg)</label>
            <input
              type="number"
              value={filters.minKg}
              onChange={(e) => handleFilterChange('minKg', e.target.value)}
              placeholder="Min kg"
              min="0"
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Max Quantity (kg)</label>
            <input
              type="number"
              value={filters.maxKg}
              onChange={(e) => handleFilterChange('maxKg', e.target.value)}
              placeholder="Max kg"
              min="0"
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Min Price (Rs/kg)</label>
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              placeholder="Min price"
              min="0"
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Max Price (Rs/kg)</label>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              placeholder="Max price"
              min="0"
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="active">Active (In Stock)</option>
              <option value="bought">Bought</option>
              <option value="sold">Sold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-actions">
            <button onClick={handleApplyFilters} className="btn-apply">
              Apply Filters
            </button>
            <button onClick={handleClearFilters} className="btn-clear">
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const PaginationControls = () => {
    if (pagination.pages <= 1) return null;

    return (
      <div className="pagination-controls" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        marginTop: '20px',
        padding: '20px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          style={{
            padding: '8px 16px',
            background: pagination.page <= 1 ? '#ecf0f1' : '#3498db',
            color: pagination.page <= 1 ? '#999' : 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer'
          }}
        >
          ← Previous
        </button>

        <span style={{ color: '#666', padding: '0 10px' }}>
          Page {pagination.page} of {pagination.pages}
          {pagination.total > 0 && ` (${pagination.total} total)`}
        </span>

        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.pages}
          style={{
            padding: '8px 16px',
            background: pagination.page >= pagination.pages ? '#ecf0f1' : '#3498db',
            color: pagination.page >= pagination.pages ? '#999' : 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer'
          }}
        >
          Next →
        </button>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="orders-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', padding: '20px' }}>
          {[1, 2, 3].map(i => (
            <SkeletonCard key={i} height="200px" />
          ))}
        </div>
      );
    }

    if (!posts || posts.length === 0) {
      return (
        <EmptyState
          icon="🚜"
          title={hasActiveFilters() ? "No posts match your filters" : "No farmer posts available"}
          message={hasActiveFilters() 
            ? "Try adjusting your filters to find more posts." 
            : "There are no vegetable posts from farmers at the moment. Check back later!"}
          actionLabel={hasActiveFilters() ? "Clear Filters" : "Refresh"}
          onAction={hasActiveFilters() ? handleClearFilters : fetchPosts}
        />
      );
    }

    return (
      <>
        <div className="orders-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', padding: '20px' }}>
          {posts.map(post => (
            <div key={post._id} className="notice-item" style={{ borderLeft: '4px solid #27ae60', background: 'white' }}>
              <div className="notice-header">
                <h3>{getAllLanguagesName(post)}</h3>
                {getStatusBadge(post.status)}
              </div>
              <div style={{ margin: '10px 0' }}>
                <p><strong>Quantity:</strong> {post.quantity} Kg</p>
                <p><strong>Price:</strong> <span className="price">Rs {post.pricePerKg}</span> /Kg</p>
                <p><strong>Total Value:</strong> <span className="price">Rs {post.totalValue?.toLocaleString() || (post.quantity * post.pricePerKg)}</span></p>
                <p><strong>Location:</strong> {post.location?.district || 'N/A'} | {post.location?.nearCity || 'N/A'} | {post.location?.village || 'N/A'}</p>
                <p><strong>Contact:</strong> {post.contactNumber}</p>
              </div>
              <div className="notice-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <span>Farmer: {post.farmerId?.name || 'N/A'}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {post.status === 'active' && (
                    <button
                      className="btn-add-cart"
                      onClick={() => handleAddToCart(post)}
                      disabled={addingToCart === post._id}
                    >
                      {addingToCart === post._id ? '⏳ Adding...' : '🛒 Add to Cart'}
                    </button>
                  )}
                  <button
                    className="btn-submit"
                    onClick={() => handleChat(post)}
                    disabled={contactingFarmer === post._id}
                    title="Chat with farmer"
                  >
                    {contactingFarmer === post._id ? '⏳' : '💬'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <PaginationControls />
      </>
    );
  };

  return (
    <PageLayout
      title="Farmer Posts"
      subtitle={`Browse vegetables listed by farmers for sale${pagination.total > 0 ? ` (${pagination.total} posts)` : ''}`}
      loading={loading}
    >
      <FilterSection />
      {renderContent()}
    </PageLayout>
  );
};

export default BrokerViewFarmerOrders;
