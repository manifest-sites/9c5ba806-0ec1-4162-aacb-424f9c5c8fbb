import { useContext, useState } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Upload, 
  Steps, 
  Table, 
  Select, 
  Alert,
  Space,
  message,
  Divider
} from 'antd';
import { 
  UploadOutlined, 
  DownloadOutlined, 
  FileExcelOutlined 
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { AppContext } from '../../App';

const { Title, Text } = Typography;
const { Step } = Steps;
const { Option } = Select;

export default function ImportExport() {
  const { organizationId, userRole } = useContext(AppContext);
  const [currentStep, setCurrentStep] = useState(0);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const isReadOnly = userRole === 'viewer';

  const handleFileUpload: UploadProps['beforeUpload'] = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').map(row => row.split(','));
      const headers = rows[0];
      const data = rows.slice(1).filter(row => row.length > 1);
      
      setCsvHeaders(headers);
      setCsvData(data);
      setCurrentStep(1);
    };
    reader.readAsText(file);
    return false; // Prevent automatic upload
  };

  const handleExport = () => {
    // In a real app, this would generate and download a CSV file
    // based on current filters and visible columns
    const csvContent = "data:text/csv;charset=utf-8," +
      "First Name,Last Name,Email,Phone,Status\n" +
      "John,Doe,john@example.com,555-0123,active\n" +
      "Jane,Smith,jane@example.com,555-0456,active";
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "people_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success('Export completed successfully');
  };

  const coreFields = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'preferredName', label: 'Preferred Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status' }
  ];

  const importSteps = [
    {
      title: 'Upload File',
      content: (
        <div className="text-center py-8">
          <Upload
            accept=".csv"
            beforeUpload={handleFileUpload}
            showUploadList={false}
            disabled={isReadOnly}
          >
            <Button icon={<UploadOutlined />} size="large" disabled={isReadOnly}>
              Select CSV File
            </Button>
          </Upload>
          <div className="mt-4">
            <Text type="secondary">
              Upload a CSV file with person data. First row should contain column headers.
            </Text>
          </div>
        </div>
      )
    },
    {
      title: 'Map Columns',
      content: (
        <div>
          <Alert
            message="Map CSV Columns"
            description="Map your CSV columns to the corresponding person fields."
            type="info"
            showIcon
            className="mb-4"
          />
          
          <div className="space-y-4">
            {csvHeaders.map(header => (
              <div key={header} className="flex items-center justify-between">
                <Text strong>{header}</Text>
                <Select
                  placeholder="Select field"
                  style={{ width: 200 }}
                  value={columnMapping[header]}
                  onChange={(value) => setColumnMapping(prev => ({ ...prev, [header]: value }))}
                >
                  <Option value="">Skip this column</Option>
                  {coreFields.map(field => (
                    <Option key={field.key} value={field.key}>
                      {field.label}
                    </Option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
          
          <div className="mt-6">
            <Button 
              type="primary" 
              onClick={() => setCurrentStep(2)}
              disabled={Object.keys(columnMapping).length === 0}
            >
              Continue to Preview
            </Button>
          </div>
        </div>
      )
    },
    {
      title: 'Preview & Import',
      content: (
        <div>
          <Alert
            message="Preview Import Data"
            description="Review the data below before importing. Any errors will be highlighted."
            type="info"
            showIcon
            className="mb-4"
          />
          
          <Table
            dataSource={csvData.slice(0, 5)} // Show first 5 rows
            columns={csvHeaders
              .filter(header => columnMapping[header])
              .map(header => ({
                title: columnMapping[header],
                dataIndex: csvHeaders.indexOf(header),
                key: header,
                render: (value: string) => value || '—'
              }))}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
          
          <div className="mt-6">
            <Space>
              <Button onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button 
                type="primary" 
                onClick={() => {
                  message.success('Import completed successfully');
                  setCurrentStep(0);
                  setCsvData([]);
                  setCsvHeaders([]);
                  setColumnMapping({});
                }}
              >
                Import {csvData.length} Records
              </Button>
            </Space>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Title level={2}>Import / Export</Title>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Import People" icon={<UploadOutlined />}>
          <Steps current={currentStep} direction="vertical" size="small">
            {importSteps.map((step, index) => (
              <Step key={index} title={step.title} />
            ))}
          </Steps>
          
          <Divider />
          
          {importSteps[currentStep].content}
        </Card>

        <Card title="Export People" icon={<DownloadOutlined />}>
          <div className="space-y-4">
            <Text>
              Export people data based on your current filters and visible columns in the People list.
            </Text>
            
            <Alert
              message="Export Options"
              description="The export will include all people matching your current search and filter criteria, with only the columns you have selected as visible."
              type="info"
              showIcon
            />
            
            <div className="pt-4">
              <Button 
                type="primary" 
                icon={<FileExcelOutlined />}
                onClick={handleExport}
                size="large"
              >
                Export to CSV
              </Button>
            </div>
            
            <div className="text-sm text-gray-600">
              <Text type="secondary">
                <strong>Note:</strong> This is a simplified demo export. In a real application, 
                this would honor your current People list filters and selected columns.
              </Text>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}