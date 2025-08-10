import { Spin } from 'antd';

interface LoadingSpinnerProps {
  size?: 'small' | 'default' | 'large';
  tip?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'large', 
  tip = 'Loading...', 
  className = 'flex justify-center items-center h-64' 
}) => {
  return (
    <div className={className}>
      <Spin size={size} tip={tip} />
    </div>
  );
};

export default LoadingSpinner;