import { Navigate, Outlet, useParams } from 'react-router-dom';
import PostTypeList from './PostTypeList.jsx';
import { DirtyProvider } from '../lib/dirty.jsx';
import { useFolders } from '../lib/hooks.js';

// Layout for /:folder and /new/:folder. Validates the folder against real
// content folders, then renders the sibling-list middle column + active
// child (PagesList table or PageEditor) inside a shared dirty-state context.
export default function PostTypeShell() {
  const { folder } = useParams();
  const { folders, isLoading } = useFolders();

  if (isLoading) return null;
  if (folder && !folders.includes(folder)) {
    return <Navigate to="/" replace />;
  }

  return (
    <DirtyProvider>
      <PostTypeList />
      <Outlet />
    </DirtyProvider>
  );
}
