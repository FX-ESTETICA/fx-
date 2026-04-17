import { MainStage } from "@/components/shared/MainStage";

// 服务端不再做任何跳转，将整个视图栈渲染权交给客户端的 MainStage
export default function RootPage() {
  return <MainStage />;
}
