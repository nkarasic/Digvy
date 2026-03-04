import { useNavigate } from 'react-router-dom';
import TopBar from '../layout/TopBar.jsx';
import PageShell from '../layout/PageShell.jsx';
import ItemForm from './ItemForm.jsx';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';

export default function ItemCreatePage() {
  const navigate = useNavigate();
  const { showToast, triggerRefresh } = useApp();

  async function handleCreate(data) {
    try {
      const item = await api.createItem(data);
      showToast('Item created');
      triggerRefresh();
      navigate(`/items/${item.id}`, { replace: true });
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  return (
    <PageShell>
      <TopBar title="New Item" showBack />
      <div className="px-4 py-4">
        <ItemForm onSubmit={handleCreate} submitLabel="Create Item" />
      </div>
    </PageShell>
  );
}
