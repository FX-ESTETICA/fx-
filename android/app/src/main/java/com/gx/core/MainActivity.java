package com.gx.core;

import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        lockGameModeFullscreen();
    }

    @Override
    public void onResume() {
        super.onResume();
        // 从后台回来，不管过了多久，立刻镇压状态栏
        lockGameModeFullscreen();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            // 弹窗关闭后，再次镇压
            lockGameModeFullscreen();
        }
    }

    @Override
    public void onMultiWindowModeChanged(boolean isInMultiWindowMode, Configuration newConfig) {
        super.onMultiWindowModeChanged(isInMultiWindowMode, newConfig);
        // 分屏模式发生改变时（进入或退出分屏），必须立刻实施物理级镇压，防止系统重置 Window 属性
        lockGameModeFullscreen();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // 屏幕旋转或折叠屏展开/折叠时，强制维持沉浸式穿透
        lockGameModeFullscreen();
    }

    /**
     * 世界顶级游戏级绝对物理全屏锁死 (支持折叠屏分屏绝对穿透)
     */
    private void lockGameModeFullscreen() {
        // 1. 绝对脱钩：哪怕状态栏或分屏把手被强行拉出，也不准挤压我的游戏画面（0抖动），允许画面100%铺满
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // 2. 刘海屏/挖孔屏穿透：允许画面渲染进摄像头的物理黑洞，消灭顶端黑边
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            // 使用 SHORT_EDGES 允许画面延伸到刘海区域
            getWindow().getAttributes().layoutInDisplayCutoutMode = 
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        // 3. 核心：粘性沉浸模式 (Immersive Sticky) 与分屏把手镇压
        WindowInsetsControllerCompat controller = 
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            
        if (controller != null) {
            // 设置行为：下拉顶部状态栏会半透明悬浮出现，几秒后自动消失
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
            // 精准切割与分屏镇压：同时抹杀顶部状态栏 (statusBars) 和 折叠屏/平板的分屏拖拽把手 (captionBar)
            // 绝对保留底/侧边导航栏 (navigationBars) 的控制权！
            controller.hide(WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.captionBar());
        }
    }
}
