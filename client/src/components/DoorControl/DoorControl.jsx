import DoorControlView from './DoorControlView';

export default function DoorControl({ door, onDoorChange, loading }) {
  const isOpen = door === 'OPEN';

  return (
    <DoorControlView
      isOpen={isOpen}
      loading={loading}
      onDoorChange={onDoorChange}
    />
  );
}
