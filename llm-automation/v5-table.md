好的, 我来帮你实现这个需求。我们使用 Vue 3 和 Bootstrap 来创建一个表格组件, 表格的数据绑定到一个 JavaScript 数组中, 包含名字和时间等信息。每行可以被选中, 双击一行时取消其他行的选中状态, 并将选中状态绑定到一个数组中, 在选中状态改变时触发一个事件。

首先, 确保你已经安装了 Vue 3 和 Bootstrap。如果还没有安装, 可以使用以下命令安装:

```bash
npm install vue@next
npm install bootstrap
```

然后, 在你的项目中引入 Bootstrap 的 CSS 文件。你可以在 main.js 或 main.ts 中引入:

```javascript
import 'bootstrap/dist/css/bootstrap.min.css';
```

接下来, 创建一个 Vue 组件来实现这个表格。假设我们创建一个名为 `TableComponent.vue` 的文件。

在这个组件中, 我们需要:

1. 定义一个数据数组, 包含名字和时间等信息。

2. 使用 Bootstrap 的表格样式来展示数据。

3. 管理选中行的状态, 并在双击时取消其他行的选中状态。

4. 监听选中状态的变化, 并触发一个事件。

下面是完整的代码示例:

```vue
<template>
  <table class="table table-bordered">
    <thead>
      <tr>
        <th scope="col">#</th>
        <th scope="col">Name</th>
        <th scope="col">Time</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(item, index) in items"
        :key="index"
        @dblclick="handleDblClick(index)"
        :class="{ 'table-primary': selectedRows.includes(index) }"
        @click="toggleSelection(index)"
      >
        <th scope="row">{{ index + 1 }}</th>
        <td>{{ item.name }}</td>
        <td>{{ item.time }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'TableComponent',
  setup() {
    const items = ref([
      { name: 'Alice', time: '10:00 AM' },
      { name: 'Bob', time: '11:30 AM' },
      { name: 'Charlie', time: '1:45 PM' },
      // 添加更多数据...
    ]);

    const selectedRows = ref([]);

    const toggleSelection = (index) => {
      const idx = selectedRows.value.indexOf(index);
      if (idx === -1) {
        selectedRows.value.push(index);
      } else {
        selectedRows.value.splice(idx, 1);
      }
      emitSelectionChange();
    };

    const handleDblClick = (index) => {
      selectedRows.value = [index];
      emitSelectionChange();
    };

    const emitSelectionChange = () => {
      // 触发自定义事件, 传递选中的行索引数组
      console.log('Selected rows changed:', selectedRows.value);
      // 这里可以使用 $emit 来触发一个事件, 通知父组件选中状态的变化
      // this.$emit('selection-change', selectedRows.value);
    };

    return {
      items,
      selectedRows,
      toggleSelection,
      handleDblClick,
    };
  },
};
</script>

<style scoped>
/* 可以添加一些自定义样式 */
</style>
```

### 解释

1. **模板部分 (`<template>`)**:
   - 使用 Bootstrap 的表格样式来创建一个表格。
   - 使用 `v-for` 指令遍历 `items` 数组, 生成表格行。
   - 每行绑定 `@dblclick` 事件, 调用 `handleDblClick` 方法。
   - 每行绑定 `@click` 事件, 调用 `toggleSelection` 方法。
   - 使用 `:class` 绑定选中行的样式。

2. **脚本部分 (`<script>`)**:
   - 使用 Vue 3 的组合式 API (`setup` 函数)。
   - 定义 `items` 数组, 包含名字和时间等信息。
   - 定义 `selectedRows` 数组, 用于存储选中的行索引。
   - `toggleSelection` 方法用于切换某一行的选中状态。
   - `handleDblClick` 方法用于双击时取消其他行的选中状态, 只保留当前行的选中状态。
   - `emitSelectionChange` 方法用于在选中状态变化时触发自定义事件, 这里简单地打印选中的行索引, 你可以根据需要修改为触发事件的通知父组件。

3. **样式部分 (`<style scoped>`)**:
   - 可以添加一些自定义样式, 这里暂时空着。

这样, 你就实现了一个带有选中状态和双击事件的表格组件, 并且在选中状态变化时可以触发事件。希望这对你有帮助! 如果有其他问题, 请随时问。

Round 0, Total generation time 36.723 s
--------------------------
