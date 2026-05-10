package com.gx.core;

import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.view.View;
import androidx.core.view.OnApplyWindowInsetsListener;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupAbsoluteImmersiveEngine();
    }

    /**
     * 建立世界顶端的绝对沉浸式引擎（物理级 Insets 拦截与抹杀）
     */
    private void setupAbsoluteImmersiveEngine() {
        View decorView = getWindow().getDecorView();
        
        // 1. 绝对脱钩：允许画面穿透一切系统限制
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // 2. 刘海屏/挖孔屏穿透
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = 
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        // 3. 毫秒级物理拦截防御塔 (对抗分屏/小窗口系统强权)
        ViewCompat.setOnApplyWindowInsetsListener(decorView, new OnApplyWindowInsetsListener() {
            @Override
            public WindowInsetsCompat onApplyWindowInsets(View v, WindowInsetsCompat insets) {
                WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), v);
                if (controller != null) {
                    controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                    
                    // 动态防御：判断系统版本，防止在老手机上因为找不到 captionBar 而闪退
                    int typesToHide = WindowInsetsCompat.Type.statusBars();
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        typesToHide |= WindowInsetsCompat.Type.captionBar();
                    }
                    
                    // 无情抹杀：不管系统何时想画状态栏，立刻斩断
                    controller.hide(typesToHide);
                }
                
                // 核心奥义：不拦截底部导航栏，允许导航手势，但把顶部状态栏的边距强行吃掉（置零）
                // 这样 WebView 永远认为上面是 0，绝不会被往下挤
                return WindowInsetsCompat.CONSUMED;
            }
        });
        
        // 首次主动触发一次
        decorView.requestApplyInsets();
    }

    @Override
    public void onResume() {
        super.onResume();
        getWindow().getDecorView().requestApplyInsets();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            getWindow().getDecorView().requestApplyInsets();
        }
    }

    @Override
    public void onMultiWindowModeChanged(boolean isInMultiWindowMode, Configuration newConfig) {
        super.onMultiWindowModeChanged(isInMultiWindowMode, newConfig);
        getWindow().getDecorView().requestApplyInsets();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        getWindow().getDecorView().requestApplyInsets();
    }
}
