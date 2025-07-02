// 演示数据清理工具

export const cleanupDemoData = () => {
  console.log('🧹 开始清理演示数据...');
  
  try {
    // 获取当前localStorage中的chat-storage数据
    const chatStorageKey = 'chat-storage';
    const storedData = localStorage.getItem(chatStorageKey);
    
    if (storedData) {
      const parsed = JSON.parse(storedData);
      console.log('📦 当前localStorage数据:', parsed);
      
      // 检查是否有演示相关数据
      const hasDemoData = 
        parsed.state?.demoMode || 
        parsed.state?.messages?.some((msg: any) => 
          msg.id?.includes('demo_') ||
          msg.content?.includes('工作压力特别大') ||
          msg.content?.includes('室友最近总是因为一些小事') ||
          msg.content?.includes('今天终于完成了我一直在准备的项目')
        );
      
      if (hasDemoData) {
        console.log('🎭 检测到演示数据，正在清理...');
        
        // 清理演示相关数据
        const cleanedState = {
          ...parsed.state,
          messages: [],
          currentReport: null,
          currentThreadId: null,
          demoMode: false,
          demoScenarioIndex: 0,
          demoStepIndex: 0,
          demoAutoPlaying: false,
          currentDemoTyping: '',
          demoTimerId: null,
          demoSendTrigger: 0,
          showInputBox: true,
          isGeneratingReport: false
        };
        
        const cleanedData = {
          ...parsed,
          state: cleanedState
        };
        
        localStorage.setItem(chatStorageKey, JSON.stringify(cleanedData));
        console.log('✅ 演示数据清理完成');
        
        return { cleaned: true, originalData: parsed, cleanedData };
      } else {
        console.log('✨ 没有检测到演示数据，无需清理');
        return { cleaned: false, data: parsed };
      }
    } else {
      console.log('📭 localStorage为空，无需清理');
      return { cleaned: false, data: null };
    }
  } catch (error) {
    console.error('❌ 清理演示数据时出错:', error);
    return { error };
  }
};

// 完全重置localStorage
export const resetLocalStorage = () => {
  console.log('🗑️ 完全重置localStorage...');
  
  try {
    localStorage.removeItem('chat-storage');
    localStorage.removeItem('reportGenerationStartTime');
    localStorage.removeItem('reportGenerationThreadId');
    localStorage.removeItem('reportGenerationMessages');
    
    console.log('✅ localStorage重置完成');
    return { success: true };
  } catch (error) {
    console.error('❌ 重置localStorage时出错:', error);
    return { error };
  }
};

// 检查localStorage状态
export const inspectLocalStorage = () => {
  console.log('🔍 检查localStorage状态...');
  
  try {
    const chatStorageKey = 'chat-storage';
    const storedData = localStorage.getItem(chatStorageKey);
    
    if (storedData) {
      const parsed = JSON.parse(storedData);
      
      console.log('📊 localStorage统计:');
      console.log('- 消息数量:', parsed.state?.messages?.length || 0);
      console.log('- 演示模式:', parsed.state?.demoMode || false);
      console.log('- 当前报告:', !!parsed.state?.currentReport);
      console.log('- 线程ID:', parsed.state?.currentThreadId || 'null');
      
      // 检查演示消息
      const demoMessages = parsed.state?.messages?.filter((msg: any) => 
        msg.id?.includes('demo_') ||
        msg.content?.includes('工作压力特别大') ||
        msg.content?.includes('室友最近总是因为一些小事') ||
        msg.content?.includes('今天终于完成了我一直在准备的项目')
      ) || [];
      
      console.log('- 演示消息数量:', demoMessages.length);
      
      if (demoMessages.length > 0) {
        console.log('🎭 发现演示消息:', demoMessages.map((msg: any) => msg.content?.substring(0, 50)));
      }
      
      return {
        total: parsed.state?.messages?.length || 0,
        demo: demoMessages.length,
        demoMode: parsed.state?.demoMode || false,
        data: parsed
      };
    } else {
      console.log('📭 localStorage为空');
      return { total: 0, demo: 0, demoMode: false, data: null };
    }
  } catch (error) {
    console.error('❌ 检查localStorage时出错:', error);
    return { error };
  }
};

// 在开发模式下暴露到window对象，方便调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).demoCleanup = {
    cleanup: cleanupDemoData,
    reset: resetLocalStorage,
    inspect: inspectLocalStorage
  };
  
  console.log('🔧 演示清理工具已加载到 window.demoCleanup');
  console.log('可用方法: cleanup(), reset(), inspect()');
} 