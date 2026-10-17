import type {Metadata} from 'next';
export const metadata:Metadata={title:'阅研 · 双语研究工作台',description:'多格式文档导入、段落对齐翻译与研究笔记'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
