import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../layout/TopBar.jsx';
import PageShell from '../layout/PageShell.jsx';
import ItemForm from './ItemForm.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import { useItem } from '../../hooks/useItems.js';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';

export default function ItemEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { item, loading } = useItem(id);
  const { showToast, triggerRefresh } = useApp();

  async function handleUpdate(data) {
    try {
      await api.updateItem(id, data);
      showToast('Item updated');
      triggerRefresh();
      navigate(`/items/${id}`, { replace: true });
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  if (loading) return <PageShell><TopBar title="Edit" showBack /><LoadingSpinner /></PageShell>;
  if (!item) return <PageShell><TopBar title="Not Found" showBack /></PageShell>;

  return (
    <PageShell>
      <TopBar title={`Edit: ${item.name}`} showBack />
      <div className="px-4 py-4">
        <ItemForm initialData={item} onSubmit={handleUpdate} submitLabel="Save Changes" />
      </div>
    </PageShell>
  );
}
