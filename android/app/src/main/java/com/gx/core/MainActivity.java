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
            // 设置行为：下拉会半透明悬浮出现，几秒后自动滚回去消失
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
            // 物理抹杀：状态栏和底部导航小白条全部干掉
            controller.hide(WindowInsetsCompat.Type.systemBars());
        }
    }
}
