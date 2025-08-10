import { Empty, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface EmptyStateProps {
  title?: string;
  description?: string;
  image?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  showAction?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data',
  description = 'Get started by creating your first item.',
  image,
  actionText = 'Create New',
  onAction,
  showAction = true
}) => {
  return (
    <Empty
      image={image}
      imageStyle={{
        height: 100,
      }}
      description={
        <div>
          <div className="font-medium text-gray-900 mb-1">{title}</div>
          <div className="text-gray-500 text-sm">{description}</div>
        </div>
      }
    >
      {showAction && onAction && (
        <Button type="primary" icon={<PlusOutlined />} onClick={onAction}>
          {actionText}
        </Button>
      )}
    </Empty>
  );
};

export default EmptyState;