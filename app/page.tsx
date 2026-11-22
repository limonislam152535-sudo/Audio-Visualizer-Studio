import { FirestoreErrorBoundary } from '@/components/FirestoreErrorBoundary';
import { StudioApp } from '@/components/StudioApp';

export default function HomePage() {
  return (
    <FirestoreErrorBoundary>
      <StudioApp />
    </FirestoreErrorBoundary>
  );
}
