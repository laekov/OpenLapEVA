好的，我来帮你实现这个需求。首先，我们需要创建一个 Vue 组件来处理表格的显示和交互，同时使用 Bootstrap 来美化表格的样式。

### 步骤 1: 引入必要的库

我们需要从 BootCDN 引入 Vue 和 Bootstrap 的 CSS 和 JS 文件。为了确保兼容性，我会选择合适的版本。

### 步骤 2: 创建 Vue 组件

我们将创建一个 Vue 组件，该组件将负责渲染表格，并处理单击和双击事件。

### 步骤 3: 管理选中状态

我们将维护一个数组来跟踪哪些行被选中，并在选中状态改变时触发事件。

### 步骤 4: 应用样式

使用 Bootstrap 的表格样式，并通过添加类来高亮显示选中的行。

### 完整代码

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue Bootstrap Table</title>
    <!-- 引入 Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div id="app">
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>
                <tr 
                    v-for="(item, index) in data" 
                    :key="index" 
                    @click="singleClick(index)" 
                    @dblclick="doubleClick(index)" 
                    :class="{ 'table-primary': isSelected(index) }"
                >
                    <td>{{ item.name }}</td>
                    <td>{{ item.time }}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- 引入 Vue JS -->
    <script src="https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js"></script>
    <script>
        new Vue({
            el: '#app',
            data: {
                data: [
                    { name: 'Alice', time: '10:00 AM' },
                    { name: 'Bob', time: '11:30 AM' },
                    { name: 'Charlie', time: '1:45 PM' }
                ],
                selectedRows: []
            },
            methods: {
                singleClick(index) {
                    if (!this.isSelected(index)) {
                        this.selectedRows = [index];
                    } else {
                        this.selectedRows = this.selectedRows.filter(i => i !== index);
                    }
                    this.triggerEvent();
                },
                doubleClick(index) {
                    this.selectedRows = [index];
                    this.triggerEvent();
                },
                isSelected(index) {
                    return this.selectedRows.includes(index);
                },
                triggerEvent() {
                    console.log('Selected rows:', this.selectedRows);
                    // 这里可以添加更多的逻辑，比如发出事件通知其他组件
                }
            }
        });
    </script>
</body>
</html>
```

### 解释

1. **HTML结构**:
    - 使用 Bootstrap 的表格样式。
    - 使用 Vue 的 `v-for` 指令遍历数据数组，生成表格行。
    - 每行绑定单击和双击事件。

2. **Vue实例**:
    - 数据部分包含表格数据和选中的行索引数组。
    - 方法部分包含单击、双击事件处理和选中状态检查。
    - 通过类绑定 `:class` 来高亮显示选中的行。

3. **事件处理**:
    - 单击行时，如果该行未被选中，则选中它；如果已选中，则取消选中。
    - 双击行时，取消所有其他行的选中状态，仅保留当前行的选中状态。
    - 每次选中状态改变时，触发 `triggerEvent` 方法，可以在该方法中添加更多的逻辑，比如发出自定义事件。

这样，你就有了一个功能齐全的表格组件，满足你的需求。如果你有任何问题或需要进一步的修改，请告诉我。
Round 0, Total generation time 30.369 s
--------------------------
