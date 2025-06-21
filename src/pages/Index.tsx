import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, LogOut, Download, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';
import 'github-markdown-css/github-markdown-light.css';

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [markdown, setMarkdown] = useState('# Welcome to Markdown Visualizer\n\nStart typing your markdown here...\n\n## Features\n- Live preview\n- PDF export\n- Google authentication\n\n**Bold text** and *italic text*\n\n> This is a blockquote');

  React.useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: "There was an error signing out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async () => {
    try {
      // 显示加载提示
      toast({
        title: "Generating PDF...",
        description: "Please wait, we are processing your document.",
      });

      // 创建一个临时的预览容器
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '800px';
      tempContainer.style.padding = '40px';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      tempContainer.style.fontSize = '14px';
      tempContainer.style.lineHeight = '1.6';
      tempContainer.style.color = '#333';
      
      // 将 markdown 转换为 HTML 并添加到临时容器
      tempContainer.innerHTML = convertMarkdownToHtml(markdown);
      tempContainer.className = 'markdown-body';
      
      document.body.appendChild(tempContainer);

      // 使用 html2canvas 将内容转换为图片
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: tempContainer.scrollHeight,
      });

      // 移除临时容器
      document.body.removeChild(tempContainer);

      // 创建 PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // A4 尺寸设置
      const pageWidth = 210; // A4 宽度 (mm)
      const pageHeight = 297; // A4 高度 (mm)
      const margin = 20; // 页边距 (mm)
      const contentWidth = pageWidth - 2 * margin; // 内容区域宽度
      const contentHeight = pageHeight - 2 * margin; // 内容区域高度
      
      // 计算图片在 PDF 中的尺寸
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // 计算需要多少页
      const totalHeight = imgHeight;
      const pagesNeeded = Math.ceil(totalHeight / contentHeight);
      
      for (let page = 0; page < pagesNeeded; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        
        // 计算当前页应该显示的内容位置（精确到像素）
        const sourceY = Math.floor(page * contentHeight * (canvas.width / imgWidth));
        const sourceHeight = Math.min(
          Math.floor(contentHeight * (canvas.width / imgWidth)),
          canvas.height - sourceY
        );
        
        // 确保不会超出画布边界
        if (sourceY >= canvas.height) {
          break;
        }
        
        // 创建当前页的 canvas
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        
        // 绘制当前页的内容
        pageCtx?.drawImage(
          canvas,
          0, sourceY, canvas.width, sourceHeight,
          0, 0, canvas.width, sourceHeight
        );
        
        // 将当前页转换为图片并添加到 PDF
        const pageImgData = pageCanvas.toDataURL('image/png');
        const actualContentHeight = Math.min(contentHeight, (sourceHeight * contentWidth) / canvas.width);
        
        pdf.addImage(
          pageImgData, 
          'PNG', 
          margin, 
          margin, 
          contentWidth, 
          actualContentHeight
        );
      }

      // 下载 PDF
      const fileName = `markdown-document-${new Date().getTime()}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF export successful",
        description: `Document saved as ${fileName}`,
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: "PDF export failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth page
  }

  // markdown 转 HTML，包裹 markdown-body 样式
  const convertMarkdownToHtml = (text: string) => {
    return `<div class='markdown-body'>${marked.parse(text)}</div>`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-indigo-600" />
              <h1 className="text-xl font-semibold text-gray-900">Markdown Visualizer</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <img 
                  src={user.user_metadata?.avatar_url} 
                  alt={user.user_metadata?.full_name || user.email}
                  className="h-8 w-8 rounded-full"
                />
                <span className="text-sm text-gray-700">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </div>
              
              <Button onClick={handleExportPDF} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Markdown Editor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                placeholder="Type your markdown here..."
                className="min-h-[500px] font-mono text-sm resize-none"
              />
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="min-h-[500px] prose prose-sm max-w-none markdown-body"
                dangerouslySetInnerHTML={{ 
                  __html: convertMarkdownToHtml(markdown) 
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
