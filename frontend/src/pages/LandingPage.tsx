import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  FileText,
  Sparkles,
  Upload,
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Github,
  AudioWaveform,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <AudioWaveform className="w-5 h-5" style={{ color: "#22c55e" }} />
            </div>
            <span className="font-bold text-xl">Verba</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Đăng nhập</Button>
            </Link>
            <Link to="/signup">
              <Button className="gradient-primary text-white">
                Dùng thử miễn phí
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 animate-fade-in">
            <Badge className="bg-teal-50 text-teal-600 border-teal-200">
              <Sparkles className="w-3 h-3 mr-1" />
              Công nghệ AI tiên tiến
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Biến cuộc họp thành <span>biên bản hoàn chỉnh</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Upload file ghi âm, nhận ngay bản tóm tắt chi tiết với transcript,
              quyết định, và công việc cần làm. Tiết kiệm hàng giờ viết biên bản
              thủ công.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="gradient-primary text-white w-full sm:w-auto"
                >
                  Bắt đầu ngay
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Xem demo
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Miễn phí dùng thử
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Không cần thẻ tín dụng
              </div>
            </div>
          </div>
          <div className="relative animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-info/20 blur-3xl rounded-full"></div>
            <Card className="relative p-6 shadow-medium">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      Cuộc họp Sprint Planning
                    </div>
                    <div className="text-xs text-muted-foreground">
                      45 phút trước
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-primary rounded-full"></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Đang xử lý transcript...
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                    <div className="text-sm">
                      <span className="font-medium">Quyết định:</span> Chọn
                      React cho frontend
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                    <div className="text-sm">
                      <span className="font-medium">Công việc:</span> Thiết kế
                      database schema
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-warning mt-0.5" />
                    <div className="text-sm">
                      <span className="font-medium">Deadline:</span> 20/03/2026
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Problem & Solution */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-6 border-destructive/20">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="text-destructive">❌</span> Vấn đề hiện tại
                </h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-1">•</span>
                    Viết biên bản họp thủ công mất nhiều thời gian
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-1">•</span>
                    Dễ bỏ sót các ý quan trọng trong cuộc họp
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-1">•</span>
                    Khó theo dõi công việc và deadline sau họp
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-1">•</span>
                    Không có bản ghi chính xác để tham khảo lại
                  </li>
                </ul>
              </Card>
              <Card className="p-6 border-success/20 bg-success/5">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="text-success">✓</span> Giải pháp của chúng
                  tôi
                </h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    AI tự động chuyển đổi giọng nói thành văn bản
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    Tóm tắt thông minh, trích xuất ý chính
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    Tự động phân loại quyết định, công việc, deadline
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    Lưu trữ và quản lý lịch sử cuộc họp dễ dàng
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-50 text-blue-600 border-blue-200">Tính năng</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Mọi thứ bạn cần cho cuộc họp hiệu quả
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Công nghệ AI tiên tiến giúp bạn tập trung vào nội dung, chúng tôi
              lo phần còn lại
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Upload className="w-6 h-6" style={{ color: "#0d9488" }} />}
              title="Upload dễ dàng"
              description="Hỗ trợ nhiều định dạng audio (.mp3, .wav). Kéo thả hoặc chọn file, đơn giản và nhanh chóng."
            />
            <FeatureCard
              icon={
                <FileText className="w-6 h-6" style={{ color: "#0d9488" }} />
              }
              title="Speech-to-Text tiếng Việt"
              description="Chuyển đổi giọng nói thành văn bản chính xác với công nghệ nhận diện tiếng Việt hiện đại."
            />
            <FeatureCard
              icon={
                <Sparkles className="w-6 h-6" style={{ color: "#0d9488" }} />
              }
              title="AI Summary thông minh"
              description="Tóm tắt tự động nội dung cuộc họp, trích xuất các điểm chính một cách thông minh."
            />
            <FeatureCard
              icon={
                <CheckCircle2
                  className="w-6 h-6"
                  style={{ color: "#0d9488" }}
                />
              }
              title="Trích xuất Decisions & Tasks"
              description="Tự động phân loại quyết định, công việc cần làm và deadline từ nội dung cuộc họp."
            />
            <FeatureCard
              icon={
                <BarChart3 className="w-6 h-6" style={{ color: "#0d9488" }} />
              }
              title="Quản lý lịch sử"
              description="Lưu trữ và tìm kiếm tất cả cuộc họp đã xử lý. Truy cập mọi lúc, mọi nơi."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" style={{ color: "#0d9488" }} />}
              title="Giao diện đơn giản"
              description="Thiết kế trực quan, dễ sử dụng. Không cần đào tạo, bắt đầu ngay lập tức."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-50 text-emerald-600 border-emerald-200">Quy trình</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Chỉ 3 bước đơn giản
            </h2>
            <p className="text-muted-foreground">
              Từ file ghi âm đến biên bản hoàn chỉnh trong vài phút
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <ProcessStep
                number="1"
                icon={<Upload className="w-8 h-8 text-gray-400" />}
                title="Upload file ghi âm "
                description="Tải lên file audio cuộc họp của bạn (.mp3, .wav)"
              />
              <ProcessStep
                number="2"
                icon={
                  <FileText className="w-8 h-8" style={{ color: "#b4aaaa" }} />
                }
                title="Hệ thống xử lý"
                description="AI chuyển đổi giọng nói thành văn bản tự động"
              />
              <ProcessStep
                number="3"
                icon={
                  <Sparkles className="w-8 h-8" style={{ color: "#b4aaaa" }} />
                }
                title="Nhận biên bản"
                description="Tóm tắt, quyết định, công việc được trích xuất sẵn"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Demo Result */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-violet-50 text-violet-600 border-violet-200">Kết quả</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Xem kết quả thực tế
            </h2>
            <p className="text-muted-foreground">
              Từ transcript đến summary chi tiết trong một giao diện
            </p>
          </div>
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Transcript</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div
                    className="font-medium mb-1"
                    style={{ color: "#059669" }}
                  >
                    Speaker 1 (00:00)
                  </div>
                  <p className="text-muted-foreground">
                    Chào mọi người, hôm nay chúng ta sẽ thảo luận về việc chọn
                    công nghệ cho dự án mới...
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div
                    className="font-medium mb-1"
                    style={{ color: "#0891b2" }}
                  >
                    Speaker 2 (00:15)
                  </div>
                  <p className="text-muted-foreground">
                    Tôi đề xuất dùng React cho frontend vì team đã quen thuộc...
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium mb-1" style={{ color: "#374151" }}>
                    Speaker 1 (00:30)
                  </div>
                  <p className="text-muted-foreground">
                    Đồng ý. Vậy ai sẽ phụ trách thiết kế database schema?
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">AI Summary</h3>
              </div>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="font-medium mb-2">📝 Tóm tắt</div>
                  <p className="text-muted-foreground">
                    Cuộc họp thảo luận về lựa chọn công nghệ cho dự án mới. Team
                    quyết định sử dụng React cho frontend.
                  </p>
                </div>
                <div>
                  <div className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Quyết định
                  </div>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Sử dụng React cho frontend</li>
                    <li>• Áp dụng TypeScript cho type safety</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-warning" />
                    Công việc
                  </div>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Thiết kế database schema (Deadline: 20/03)</li>
                    <li>• Setup project structure (Deadline: 22/03)</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-amber-50 text-amber-600 border-amber-200">Lợi ích</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tại sao chọn Verba?
            </h2>
          </div>
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
            <BenefitCard
              icon={<Clock className="w-6 h-6" style={{ color: "#0d9488" }} />}
              title="Tiết kiệm thời gian"
              description="Giảm 90% thời gian viết biên bản. Tập trung vào công việc quan trọng hơn."
            />
            <BenefitCard
              icon={<Shield className="w-6 h-6" style={{ color: "#0d9488" }} />}
              title="Không bỏ sót thông tin"
              description="AI ghi nhận mọi chi tiết quan trọng, đảm bảo không bỏ sót ý nào."
            />
            <BenefitCard
              icon={
                <BarChart3 className="w-6 h-6" style={{ color: "#0d9488" }} />
              }
              title="Theo dõi công việc dễ dàng"
              description="Tasks và deadlines được trích xuất rõ ràng, dễ dàng theo dõi tiến độ."
            />
            <BenefitCard
              icon={<Users className="w-6 h-6" style={{ color: "#0d9488" }} />}
              title="Phù hợp mọi nhóm"
              description="Từ sinh viên đến team dự án, ai cũng có thể sử dụng hiệu quả."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto p-12 text-center gradient-primary text-white shadow-medium">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Sẵn sàng nâng cao hiệu quả cuộc họp?
            </h2>
            <p className="text-white/90 mb-8 text-lg">
              Bắt đầu miễn phí ngay hôm nay. Không cần thẻ tín dụng.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  Bắt đầu ngay
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Đăng nhập
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <AudioWaveform
                    className="w-5 h-5"
                    style={{ color: "#ffffff" }}
                  />
                </div>
                <span className="font-bold text-xl">Verba</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Giải pháp AI cho cuộc họp hiệu quả
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Sản phẩm</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    to="/signup"
                    className="hover:text-primary transition-colors"
                  >
                    Tính năng
                  </Link>
                </li>
                <li>
                  <Link
                    to="/signup"
                    className="hover:text-primary transition-colors"
                  >
                    Bảng giá
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="hover:text-primary transition-colors"
                  >
                    Demo
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Công ty</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Về chúng tôi
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Liên hệ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Kết nối</h4>
              <div className="flex gap-3">
                <a
                  href="#"
                  className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                >
                  <Github className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>
              © 2026 Verba. Dự án DAT301m - Công nghệ AI cho cuộc họp thông
              minh.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper Components
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="p-6 hover:shadow-medium transition-shadow">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}

function ProcessStep({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-primary text-white flex items-center justify-center mx-auto mb-4 shadow-medium">
          {icon}
        </div>
        <div className="absolute top-8 left-1/2 -translate-x-1/2 -z-10 text-6xl font-bold text-muted/20">
          {number}
        </div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
