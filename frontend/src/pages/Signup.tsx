import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { AudioWaveform, Loader2, Lock, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/useAuth";
import { useToast } from "@/hooks/use-toast";

const signupSchema = z
  .object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function Signup() {
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);

    try {
      const result = await signup(data.email, data.password);
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Đăng ký thất bại",
          description: result.error || "Email này đã tồn tại hoặc có lỗi xảy ra.",
        });
        return;
      }

      toast({
        title: "Đăng ký thành công",
        description: "Tài khoản của bạn đã được tạo!",
      });
      navigate("/dashboard");
    } catch {
      toast({
        variant: "destructive",
        title: "Đăng ký thất bại",
        description: "Đã xảy ra lỗi không mong muốn.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-accent via-background to-secondary p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50 shadow-medium">
          <CardHeader className="space-y-4 text-center">
            <div className="gradient-primary mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-soft">
              <AudioWaveform className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Tạo tài khoản
              </CardTitle>
              <CardDescription className="mt-2 text-muted-foreground">
                Đăng ký để bắt đầu sử dụng Verba
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="email@example.com"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mật khẩu</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Xác nhận mật khẩu</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="gradient-primary w-full transition-opacity hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang tạo tài khoản...
                    </>
                  ) : (
                    "Đăng ký"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Đã có tài khoản?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Đăng nhập
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
