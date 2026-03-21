import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [vegetables, setVegetables] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Filter state - exactly 3 filters as requested
  const [filters, setFilters] = useState({
    vegetableId: '',
    district: '',
    nearCity: '',
    minKg: '',
    maxKg: ''
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
      if (value && value.toString().trim() !== '') {
        params.append(key, value.toString().trim());
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
      minKg: '',
      maxKg: ''
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
    return Object.values(filters).some(v => v && v.toString().trim() !== '');
  };

  const FilterBar = () => (
    <div className="farmer-filter-bar">
      <div className="filter-row">
        {/* Vegetable Dropdown */}
        <div className="filter-item">
          <label>Vegetable</label>
          <select
            value={filters.vegetableId}
            onChange={(e) => handleFilterChange('vegetableId', e.target.value)}
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

        {/* District */}
        <div className="filter-item">
          <label>District</label>
          <input
            type="text"
            value={filters.district}
            onChange={(e) => handleFilterChange('district', e.target.value)}
            placeholder="e.g., Colombo"
          />
        </div>

        {/* Near City */}
        <div className="filter-item">
          <label>Near City</label>
          <input
            type="text"
            value={filters.nearCity}
            onChange={(e) => handleFilterChange('nearCity', e.target.value)}
            placeholder="e.g., Kandy"
          />
        </div>

        {/* Min Quantity */}
        <div className="filter-item filter-item-small">
          <label>Min Kg</label>
          <input
            type="number"
            value={filters.minKg}
            onChange={(e) => handleFilterChange('minKg', e.target.value)}
            placeholder="Min"
            min="0"
          />
        </div>

        {/* Max Quantity */}
        <div className="filter-item filter-item-small">
          <label>Max Kg</label>
          <input
            type="number"
            value={filters.maxKg}
            onChange={(e) => handleFilterChange('maxKg', e.target.value)}
            placeholder="Max"
            min="0"
          />
        </div>

        {/* Action Buttons */}
        <div className="filter-actions">
          <button className="btn-apply-filter" onClick={handleApplyFilters}>
            Filter
          </button>
          {hasActiveFilters() && (
            <button className="btn-clear-filter" onClick={handleClearFilters}>
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const PaginationControls = () => {
    if (pagination.pages <= 1) return null;

    return (
      <div className="pagination-bar">
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          ← Prev
        </button>
        <span>Page {pagination.page} of {pagination.pages} ({pagination.total} posts)</span>
        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.pages}
        >
          Next →
        </button>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="orders-container">
          {[1, 2, 3, 4].map(i => (
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
            : "There are no vegetable posts from farmers at the moment."}
          actionLabel={hasActiveFilters() ? "Clear Filters" : "Refresh"}
          onAction={hasActiveFilters() ? handleClearFilters : () => fetchPosts()}
        />
      );
    }

    return (
      <>
        <div className="orders-container">
          {posts.map(post => (
            <div key={post._id} className="notice-item" style={{ borderLeft: '4px solid #27ae60', background: 'white' }}>
              <div className="notice-header">
                <h3>{getAllLanguagesName(post)}</h3>
                {getStatusBadge(post.status)}
              </div>
              <div style={{ margin: '10px 0' }}>
                <p><strong>Quantity:</strong> {post.quantity} Kg</p>
                <p><strong>Price:</strong> <span className="price">Rs {post.pricePerKg}</span> /Kg</p>
                <p><strong>Total:</strong> <span className="price">Rs {post.totalValue?.toLocaleString() || (post.quantity * post.pricePerKg)}</span></p>
                <p><strong>Location:</strong> {post.location?.district || 'N/A'} | {post.location?.nearCity || 'N/A'}</p>
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
      <FilterBar />
      {renderContent()}
    </PageLayout>
  );
};

export default BrokerViewFarmerOrders;
