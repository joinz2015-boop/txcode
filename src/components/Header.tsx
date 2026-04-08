import React from 'react';
import { Box, Text } from 'ink';

const VERSION = '1.0.23';

export const Header = React.memo(function Header() {
	return (
		<Box 
			flexDirection="column" 
			borderStyle="round" 
			borderColor="cyan" 
			paddingX={2} 
			paddingY={1}
		>
			<Text bold cyan>                            </Text>
			<Text bold cyan>    Txcode v{VERSION}        </Text>
			<Text bold cyan>                            </Text>
			<Text dimColor>    输入@ 选择文件            </Text>
			<Text dimColor>    输入 /new 新建会话        </Text>
			<Text dimColor>    输入 /compact 压缩上下文  </Text>
			<Text bold cyan>                            </Text>
		</Box>
	);
});