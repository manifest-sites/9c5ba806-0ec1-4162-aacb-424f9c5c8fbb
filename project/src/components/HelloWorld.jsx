import { Typography } from 'antd'

const { Title, Text } = Typography

function HelloWorld() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="text-center space-y-6 bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto">
        <div className="animate-bounce">
          <Title level={1} className="text-gradient bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Hello World! 👋
          </Title>
        </div>
        <Text className="text-gray-600 text-lg">
          Welcome to your simple placeholder app
        </Text>
        <div className="flex justify-center space-x-2 text-2xl">
          <span className="animate-pulse">🌟</span>
          <span className="animate-pulse delay-75">✨</span>
          <span className="animate-pulse delay-150">🎉</span>
        </div>
      </div>
    </div>
  )
}

export default HelloWorld