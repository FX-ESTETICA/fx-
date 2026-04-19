package com.gx.core;

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

    /**
     * 世界顶级游戏级绝对物理全屏锁死
     */
    private void lockGameModeFullscreen() {
        // 1. 绝对脱钩：哪怕状态栏被强行拉出，也不准挤压我的游戏画面（0抖动）
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // 2. 刘海屏/挖孔屏穿透：允许画面渲染进摄像头的物理黑洞，消灭顶端黑边
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = 
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        // 3. 核心：粘性沉浸模式 (Immersive Sticky)
        WindowInsetsControllerCompat controller = 
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            
        if (controller != null) {
            // 设置行为：下拉顶部状态栏会半透明悬浮出现，几秒后自动消失
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
            // 精准切割：物理抹杀顶部状态栏 (statusBars)，但绝对保留底/侧边导航栏 (navigationBars) 的控制权！
            // 这行代码是消灭“侧边手势返回需要滑动两次”防误触 BUG 的唯一解法
            controller.hide(WindowInsetsCompat.Type.statusBars());
        }
    }
}
