function node(zh, category, level, summary, why, productions, example, constraints, coverage) {
  return { zh, category, level, summary, why, productions, example, constraints, coverage };
}

const grammar = {
  CompUnit: node(
    "编译单元", "程序结构", "C",
    "整个 SysY 文件的最外层：先写全局声明，再写普通函数，最后写唯一的 main。",
    "它是语法分析的起点，也解释了为什么 main 必须在最后。",
    ["{ Decl } { FuncDef } MainFuncDef"],
    "const int N = 4;\n\nint helper() {\n    return N;\n}\n\nint main() {\n    return 0;\n}",
    ["Decl 和 FuncDef 都可以完全没有。", "MainFuncDef 必须恰好出现一次，并位于文件最后。"],
    ["testfile1：省略 Decl / FuncDef", "testfile2-6：完整结构"]
  ),
  Decl: node(
    "声明", "声明", "C",
    "声明只有两大类：常量声明和变量声明。",
    "所有名字都要求先定义再使用；声明也是以后建立符号表的来源。",
    ["ConstDecl", "VarDecl"],
    "const int LIMIT = 10;\nint value = 3;",
    ["同一作用域不能重复定义同名标识符。"],
    ["testfile2-6"]
  ),
  ConstDecl: node(
    "常量声明", "声明", "C",
    "用 const 声明一个或多个不可修改的名字。",
    "它同时测试 const、基本类型、多定义和编译期初值。",
    ["'const' BType ConstDef { ',' ConstDef } ';'"],
    "const int FIRST = 1, SECOND = 2, THIRD = 3;",
    ["常量必须初始化。", "覆盖“重复多次”时要在同一条声明里写至少三个 ConstDef。"],
    ["testfile2：一个与三个常量", "testfile4：char 常量"]
  ),
  BType: node(
    "基本类型", "声明", "C",
    "SysY 的基本数据类型只有 int 和 char。",
    "很多语义错误都来自这两种类型被错误混用。",
    ["'int'", "'char'"],
    "int number = 10;\nchar letter = 'A';",
    ["int 与 char 不能隐式混算。", "char 在 SysY 中固定为无符号 8 位。"],
    ["int：testfile1-6", "char：testfile4-6"]
  ),
  ConstDef: node(
    "常量定义", "声明", "C",
    "给常量起名字，可定义普通常量或一维常量数组。",
    "它决定常量的名字、数组长度和初始化方式。",
    ["Ident [ '[' ConstExp ']' ] '=' ConstInitVal"],
    "const int SIZE = 4;\nconst int values[3] = {1, 2, 3};",
    ["数组长度必须是 int 型 ConstExp。", "定义后不能再给常量赋值。"],
    ["testfile2-4"]
  ),
  ConstInitVal: node(
    "常量初值", "声明", "C",
    "常量可以用常表达式、数组列表或字符串初始化。",
    "三种候选都要覆盖，数组列表内部还有空与多个元素的组合。",
    ["ConstExp", "'{' [ ConstExp { ',' ConstExp } ] '}'", "StringConst"],
    "const int N = 4;\nconst int empty[3] = {};\nconst char word[4] = \"CAT\";",
    ["常量初值必须能在编译期求出。", "未写出的数组元素补 0。"],
    ["标量：testfile2", "列表/空列表：testfile3", "字符串：testfile4"]
  ),
  VarDecl: node(
    "变量声明", "声明", "C",
    "声明一个或多个变量；局部变量前可以有 static。",
    "它把 static、基本类型、多个 VarDef 和分号组合在一起。",
    ["[ 'static' ] BType VarDef { ',' VarDef } ';'"],
    "int x = 1, y, z = 3;\nstatic int calls;",
    ["static 只允许修饰局部变量。", "同一声明至少写三个 VarDef 才覆盖“重复多次”。"],
    ["普通变量：全部测试", "static：testfile2"]
  ),
  VarDef: node(
    "变量定义", "声明", "C",
    "变量可以是普通变量或一维数组，也可以有初值或没有初值。",
    "这条规则的两个大分支分别是“无初始化”和“有初始化”。",
    ["Ident [ '[' ConstExp ']' ]", "Ident [ '[' ConstExp ']' ] '=' InitVal"],
    "int value;\nint data[3];\nint answer = 42;\nint zeros[2] = {};",
    ["普通局部变量没有初值时不能直接读取。", "无初值全局变量和 static 变量自动为 0。"],
    ["testfile1-4"]
  ),
  InitVal: node(
    "变量初值", "声明", "C",
    "变量初值可以是普通表达式、数组列表或字符串。",
    "局部变量可以用运行时表达式初始化，比常量初值更宽松。",
    ["Exp", "'{' [ Exp { ',' Exp } ] '}'", "StringConst"],
    "int result = helper();\nint data[3] = {1, 2, 3};\nchar text[6] = \"hello\";",
    ["全局变量初值仍必须能在编译期求出。", "单个变量只能使用单个表达式初值。"],
    ["表达式：全部测试", "列表：testfile3/5", "字符串：testfile4"]
  ),
  FuncDef: node(
    "函数定义", "函数", "C",
    "定义普通函数：返回类型、函数名、可选形参和函数体。",
    "函数集中体现参数匹配、作用域和 return 规则。",
    ["FuncType Ident '(' [ FuncFParams ] ')' Block"],
    "int add(int a, int b, int c) {\n    return a + b + c;\n}",
    ["有返回值函数最后一句必须显式 return。", "函数要在调用位置之前定义。"],
    ["testfile2-6"]
  ),
  MainFuncDef: node(
    "主函数定义", "程序结构", "C",
    "程序唯一入口，形式固定为 int main()。",
    "评测运行从这里开始，学号输出也必须首先在这里执行。",
    ["'int' 'main' '(' ')' Block"],
    "int main() {\n    printf(\"24373099\\n\");\n    return 0;\n}",
    ["不能带参数。", "最后只能返回常数 0。", "一个文件只能有一个 main。"],
    ["testfile1-6"]
  ),
  FuncType: node(
    "函数类型", "函数", "C",
    "普通函数可以不返回值，也可以返回 int 或 char。",
    "返回类型决定函数里允许使用哪一种 return。",
    ["'void'", "'int'", "'char'"],
    "void log() { return; }\nint number() { return 1; }\nchar letter() { return 'A'; }",
    ["void 只能使用不带表达式的 return。", "int/char 返回值类型必须精确匹配。"],
    ["void/int：testfile2", "char：testfile4/6"]
  ),
  FuncFParams: node(
    "函数形参表", "函数", "C",
    "一个或多个形式参数，用逗号分隔。",
    "它需要同时覆盖一个形参和至少三个形参。",
    ["FuncFParam { ',' FuncFParam }"],
    "int identity(int value) { return value; }\nint mix(int a, int b, int c) { return a + b + c; }",
    ["无参数函数不是这条规则的“重复 0 次”，而是 FuncDef 中整个 FuncFParams 缺省。"],
    ["一个：identity", "三个：combine/use_three/match"]
  ),
  FuncFParam: node(
    "函数形参", "函数", "C",
    "一个参数由基本类型、名字和可选的空方括号组成。",
    "空方括号表示一维数组参数，函数接收数组起始地址。",
    ["BType Ident [ '[' ']' ]"],
    "int value\nint values[]\nchar text[]",
    ["数组形参没有在方括号内写长度。", "int[] 与 char[] 是不同类型。"],
    ["普通参数：testfile2", "数组参数：testfile3/6"]
  ),
  FuncRParams: node(
    "函数实参表", "函数", "C",
    "调用函数时实际传入的一个或多个表达式。",
    "这里要覆盖一个实参、至少三个实参、整个数组和数组元素。",
    ["Exp { ',' Exp }"],
    "identity(value)\ncombine(a, b, c)\nmatch(text, text[1], 1)",
    ["实参数量必须与形参一致。", "每一个实参类型都必须完全匹配。"],
    ["testfile2/3/6"]
  ),
  Block: node(
    "语句块", "语句", "C",
    "一对大括号包围零个或多个声明或语句。",
    "Block 建立新作用域；空 Block 和包含多个项目的 Block 都要覆盖。",
    ["'{' { BlockItem } '}'"],
    "{\n    int local = 1;\n    printf(\"%d\\n\", local);\n}",
    ["内层可以遮蔽外层名字。", "同一级作用域不能重名。"],
    ["空块：testfile2", "多项目：所有 main"]
  ),
  BlockItem: node(
    "语句块项", "语句", "C",
    "语句块里的每一项，要么是声明，要么是语句。",
    "它说明 SysY 函数体中可以混合出现声明和执行语句。",
    ["Decl", "Stmt"],
    "{\n    int value = 1;\n    value = value + 1;\n}",
    ["名字从声明位置开始生效。"],
    ["所有 main"]
  ),
  Stmt: node(
    "语句", "语句", "C",
    "程序会执行的动作集合：赋值、表达式、块、分支、循环、switch、跳转、返回和输出。",
    "这是候选最多的一条规则，漏覆盖最常发生在这里。",
    [
      "LVal '=' Exp ';'",
      "[ Exp ] ';'",
      "Block",
      "'if' '(' Cond ')' Stmt [ 'else' Stmt ]",
      "'while' '(' Cond ')' Stmt",
      "'switch' '(' Exp ')' '{' { CaseStmt } '}'",
      "'break' ';'",
      "'continue' ';'",
      "'return' [ Exp ] ';'",
      "'printf' '(' StringConst { ',' Exp } ')' ';'"
    ],
    "value = 1;\n;\nif (value > 0) { value = value - 1; }\nreturn value;",
    ["continue 只能在 while 中。", "break 只能在 while 或 switch 中。", "else 总与最近的未配对 if 结合。"],
    ["testfile1：基础语句", "testfile3：switch", "testfile4-6：综合"]
  ),
  CaseStmt: node(
    "Case 语句", "语句", "B",
    "switch 内的 case 分支或 default 分支。",
    "它测试类型匹配、重复标签、default 数量和贯穿行为。",
    ["'case' Number ':' { Stmt }", "'default' ':' { Stmt }"],
    "case 1:\n    value = 2;\n    break;\ndefault:\n    value = 0;",
    ["case Number 类型必须与 switch Exp 完全一致。", "case 值不能重复，最多一个 default。", "没有 break 会贯穿到下一个分支。"],
    ["int case：testfile3/6", "char case：testfile4/5"]
  ),
  Exp: node(
    "表达式", "表达式", "C",
    "普通算术表达式的入口，本质上从加减表达式开始。",
    "赋值右侧、函数实参、返回值和数组下标等位置都会使用 Exp。",
    ["AddExp"],
    "a + b * 2",
    ["普通 Exp 中不使用逻辑非 !。"],
    ["所有测试"]
  ),
  Cond: node(
    "条件表达式", "表达式", "C",
    "if 和 while 使用的条件入口，可以一直展开到逻辑或。",
    "A 级复杂条件正是通过 LOrExp 和 LAndExp 实现的。",
    ["LOrExp"],
    "value > 0 && value < 10",
    ["0 为假，非 0 为真。", "逻辑结果类型为 int。"],
    ["简单条件：testfile1-4", "复杂条件：testfile5/6"]
  ),
  LVal: node(
    "左值表达式", "表达式", "C",
    "一个名字，或这个名字所代表数组中的某个元素。",
    "赋值号左侧必须是可修改变量形式的 LVal。",
    ["Ident [ '[' Exp ']' ]"],
    "value\nvalues[index]",
    ["常量可以读取但不能放在赋值号左侧。", "访问数组元素时下标必须是 int。"],
    ["普通变量：全部", "数组元素：testfile3-6"]
  ),
  PrimaryExp: node(
    "基本表达式", "表达式", "C",
    "表达式最基础的三种形态：括号、左值和数值。",
    "它是表达式递归向下的落点。",
    ["'(' Exp ')'", "LVal", "Number"],
    "(a + b)\nvalue\n42",
    ["括号必须成对。"],
    ["testfile1/4/5/6"]
  ),
  Number: node(
    "数值", "表达式", "C",
    "数值可以是整数常量，也可以是字符常量。",
    "字符常量在 SysY 中属于 char，不像 C 中那样属于 int。",
    ["IntConst", "CharConst"],
    "42\n'A'",
    ["int 与 char 不自动转换。"],
    ["整数：全部", "字符：testfile4-6"]
  ),
  UnaryExp: node(
    "一元表达式", "表达式", "C",
    "基本表达式、函数调用、一元运算和显式类型转换都从这里进入。",
    "函数调用与强制类型转换是否被正确识别，都依赖这条规则。",
    ["PrimaryExp", "Ident '(' [ FuncRParams ] ')'", "UnaryOp UnaryExp", "'(' BType ')' UnaryExp"],
    "value\nhelper()\ncombine(a, b, c)\n-value\n(int)'A'",
    ["类型转换的操作数只能是 int 或 char。", "相邻两个 UnaryOp 不能相同。"],
    ["调用：testfile1-6", "转换：testfile4/6"]
  ),
  UnaryOp: node(
    "单目运算符", "表达式", "C",
    "对一个表达式施加正号、负号或逻辑非。",
    "逻辑非只能出现在条件中，是容易误用 C 写法的地方。",
    ["'+'", "'-'", "'!'"],
    "+value\n-value\nif (!value) { ; }",
    ["! 只允许出现在 Cond 中。", "不能连续写两个相同的一元运算符。"],
    ["+/-：testfile1/6", "!：testfile5"]
  ),
  MulExp: node(
    "乘除模表达式", "表达式", "C",
    "处理乘法、除法和取模，优先级高于加减。",
    "递归写法表达了从左到右结合。",
    ["UnaryExp", "MulExp ( '*' | '/' | '%' ) UnaryExp"],
    "a * b / 2 % 10",
    ["除数和模数不能为 0。", "两侧类型必须一致。"],
    ["testfile1"]
  ),
  AddExp: node(
    "加减表达式", "表达式", "C",
    "处理加法和减法，操作数来自更高优先级的 MulExp。",
    "普通 Exp 和 ConstExp 都会进入这一层。",
    ["MulExp", "AddExp ( '+' | '-' ) MulExp"],
    "a + b - c",
    ["int 与 char 不能直接混合。"],
    ["所有测试"]
  ),
  RelExp: node(
    "关系表达式", "表达式", "C",
    "比较大小：小于、大于、小于等于和大于等于。",
    "它把算术值转成真假判断。",
    ["AddExp", "RelExp ( '<' | '>' | '<=' | '>=' ) AddExp"],
    "a < b\na > b\na <= b\na >= b",
    ["参与比较的两侧类型必须一致。"],
    ["四种运算：testfile1"]
  ),
  EqExp: node(
    "相等性表达式", "表达式", "C",
    "判断相等或不相等。",
    "它位于关系表达式之上、逻辑与之下。",
    ["RelExp", "EqExp ( '==' | '!=' ) RelExp"],
    "value == 0\nleft != right",
    ["两侧类型必须一致。"],
    ["==：testfile1/5/6", "!=：testfile1/5"]
  ),
  LAndExp: node(
    "逻辑与表达式", "表达式", "A",
    "用 && 连接条件；左侧为假时右侧不执行。",
    "这是 A 级短路求值的第一部分。",
    ["EqExp", "LAndExp '&&' EqExp"],
    "ready && check()",
    ["结果始终为 int 类型的 0 或 1。", "必须实现短路。"],
    ["testfile5/6"]
  ),
  LOrExp: node(
    "逻辑或表达式", "表达式", "A",
    "用 || 连接条件；左侧为真时右侧不执行。",
    "它是 Cond 的最外层，也是优先级最低的逻辑层。",
    ["LAndExp", "LOrExp '||' LAndExp"],
    "cached || compute()",
    ["结果始终为 int 类型的 0 或 1。", "必须实现短路。"],
    ["testfile5/6"]
  ),
  ConstExp: node(
    "常量表达式", "表达式", "C",
    "编译期就能算出的加减表达式。",
    "它用于数组长度、常量初值、全局变量初值和 static 初值。",
    ["AddExp"],
    "4\n1 + 2\n(int)'A'",
    ["不能访问普通变量。", "不能调用函数。", "数组长度位置必须得到 int。"],
    ["testfile2-6"]
  ),
  Ident: node(
    "标识符", "词法", "C",
    "变量、常量和函数的名字。",
    "词法分析器首先要能把合法名字完整识别出来。",
    ["identifier-nondigit", "identifier identifier-nondigit", "identifier digit"],
    "_value\ncamelCase\nDATA_2026",
    ["首字符不能是数字。", "关键字不能作为标识符。"],
    ["所有测试"]
  ),
  IntConst: node(
    "整型常量", "词法", "C",
    "十进制整数：0，或由非零数字开头的数字串。",
    "SysY 不要求十六进制、八进制和 C 的各种整数后缀。",
    ["decimal-const", "'0'"],
    "0\n1\n255\n2026",
    ["不要写 012、0x10、10U 等 C 扩展形式。"],
    ["所有测试"]
  ),
  CharConst: node(
    "字符常量", "词法", "B",
    "单引号包围的一个普通可见字符或规定的转义字符。",
    "它是 char 类型，不是 C 语言中的 int 字符常量。",
    ["\"'\" CharElement \"'\""],
    "'A'\n'\\n'\n'\\t'\n'\\r'\n'\\0'\n'\\\\'\n'\\''",
    ["支持六种转义：\\n、\\t、\\r、\\0、\\\\、\\'。"],
    ["testfile4：全部转义", "testfile5/6：普通字符"]
  ),
  StringConst: node(
    "字符串常量", "词法", "B",
    "双引号包围的普通字符、格式字符和换行转义。",
    "它既用于 printf，也可以初始化 char 数组。",
    ["'\"' { Char } '\"'"],
    "\"hello\"\n\"value=%d\\n\"\n\"%c %s\\n\"",
    ["格式字符只考虑 %d、%c、%s。", "字符串转义只重点支持 \\n。"],
    ["所有测试的学号输出", "testfile4：三种格式"]
  )
};

// 这份清单描述评测所统计的“分支/组合覆盖”，与后面的语义限制分开。
// 对 []、{} 明确列出 0/1/多次，避免只看懂产生式却漏写测试。
const coverageRequirements = {
  CompUnit: ["出现全局 Decl", "完全不出现全局 Decl", "出现普通 FuncDef", "完全不出现普通 FuncDef", "始终以唯一的 MainFuncDef 收尾"],
  Decl: ["选择 ConstDecl（常量声明）", "选择 VarDecl（变量声明）"],
  ConstDecl: ["只写 1 个 ConstDef：花括号重复 0 次", "同一条声明写至少 3 个 ConstDef：花括号重复至少 2 次"],
  BType: ["使用 int", "使用 char"],
  ConstDef: ["定义普通标量常量", "定义带 ConstExp 长度的一维常量数组"],
  ConstInitVal: ["使用单个 ConstExp 初始化", "使用数组花括号初始化：{} 空列表", "使用数组花括号初始化：1 个元素", "使用数组花括号初始化：至少 3 个元素", "使用 StringConst 初始化 char 数组"],
  VarDecl: ["不带 static 的声明", "带 static 的局部声明", "只写 1 个 VarDef：花括号重复 0 次", "同一条声明写至少 3 个 VarDef：花括号重复至少 2 次"],
  VarDef: ["普通变量，无初值", "普通变量，有初值", "一维数组，无初值", "一维数组，有初值"],
  InitVal: ["使用单个 Exp 初始化", "使用数组花括号初始化：{} 空列表", "使用数组花括号初始化：1 个元素", "使用数组花括号初始化：至少 3 个元素", "使用 StringConst 初始化 char 数组"],
  FuncDef: ["定义无形参函数：省略 FuncFParams", "定义有形参函数：出现 FuncFParams"],
  MainFuncDef: ["存在且只存在一个 int main()", "main 位于所有声明和普通函数之后"],
  FuncType: ["void 返回类型", "int 返回类型", "char 返回类型"],
  FuncFParams: ["只有 1 个 FuncFParam：花括号重复 0 次", "至少 3 个 FuncFParam：花括号重复至少 2 次"],
  FuncFParam: ["普通变量形参", "带空方括号 [] 的一维数组形参"],
  FuncRParams: ["只有 1 个 Exp 实参：花括号重复 0 次", "至少 3 个 Exp 实参：花括号重复至少 2 次", "把整个数组作为实参", "把数组元素作为实参"],
  Block: ["空语句块：BlockItem 重复 0 次", "只有 1 个 BlockItem", "至少 2 个 BlockItem"],
  BlockItem: ["选择 Decl", "选择 Stmt"],
  Stmt: ["赋值语句 LVal = Exp;", "空表达式语句 ;", "有 Exp 的表达式语句 Exp;（包括普通函数调用）", "语句块 Block", "if 不带 else", "if 带 else", "while 循环", "switch：还要覆盖不同的 case/default 组合", "break;", "continue;", "return; 不带 Exp", "return Exp; 带 Exp", "printf 只有 StringConst、没有额外 Exp", "printf 带 1 个 Exp", "printf 带多个 Exp"],
  CaseStmt: ["case Number 分支", "default 分支", "标签后没有 Stmt", "标签后只有 1 个 Stmt", "标签后有多个 Stmt", "有 break 与无 break 的贯穿情况"],
  Exp: ["至少出现一个能展开到 AddExp 的普通表达式"],
  Cond: ["至少出现一个能展开到 LOrExp 的条件表达式"],
  LVal: ["普通变量或常量 Ident", "一维数组元素 Ident[Exp]"],
  PrimaryExp: ["嵌套括号表达式 (Exp)", "LVal", "Number"],
  Number: ["IntConst 整型常量", "CharConst 字符常量"],
  UnaryExp: ["PrimaryExp", "无实参函数调用 Ident()", "有 FuncRParams 的函数调用", "UnaryOp UnaryExp", "显式类型转换 (BType) UnaryExp"],
  UnaryOp: ["一元正号 +", "一元负号 -", "逻辑非 !（只放在 Cond 中）"],
  MulExp: ["只含 UnaryExp，不出现乘除模", "乘法 *", "除法 /", "取模 %"],
  AddExp: ["只含 MulExp，不出现加减", "加法 +", "减法 -"],
  RelExp: ["只含 AddExp，不出现关系运算", "小于 <", "大于 >", "小于等于 <=", "大于等于 >="],
  EqExp: ["只含 RelExp，不出现相等运算", "等于 ==", "不等于 !="],
  LAndExp: ["只含 EqExp，不出现 &&", "出现逻辑与 &&，并验证短路"],
  LOrExp: ["只含 LAndExp，不出现 ||", "出现逻辑或 ||，并验证短路"],
  ConstExp: ["至少出现一个 AddExp", "表达式中的 Ident 只能引用常量"],
  Ident: ["以下划线开头的名字", "以大写或小写字母开头的名字", "后续包含字母、下划线或数字", "不使用任何保留关键字作名字"],
  IntConst: ["单独的 0", "1 到 9 的单个非零数字", "非零数字开头的多位十进制数"],
  CharConst: ["普通可见 ASCII 字符", "转义 \\n", "转义 \\t", "转义 \\r", "转义 \\0", "转义 \\\\", "转义 \\'"],
  StringConst: ["只含普通字符的字符串", "空字符串", "包含换行转义 \\n", "分别使用格式字符 %d、%c、%s", "printf 中格式字符的数量、顺序、类型与后续 Exp 对应"]
};

// 每个正式产生式的一句话直译，顺序与 grammar[name].productions 完全对应。
const productionHints = {
  CompUnit: ["整个文件：先全局声明，再普通函数，最后 main"],
  Decl: ["声明常量", "声明变量"],
  ConstDecl: ["const + 类型 + 一个或多个常量定义"],
  BType: ["32 位整数类型", "8 位无符号字符类型"],
  ConstDef: ["常量名，可带数组长度，而且必须初始化"],
  ConstInitVal: ["用常量表达式初始化单值", "用花括号初始化数组，可以是空表", "用字符串初始化 char 数组"],
  VarDecl: ["可选 static + 类型 + 一个或多个变量定义"],
  VarDef: ["变量或数组，不写初值", "变量或数组，同时写初值"],
  InitVal: ["用表达式初始化单值", "用花括号初始化数组，可以是空表", "用字符串初始化 char 数组"],
  FuncDef: ["普通函数：返回类型、名字、可选参数、函数体"],
  MainFuncDef: ["固定形式的程序入口 int main()"],
  FuncType: ["无返回值函数", "返回 int 的函数", "返回 char 的函数"],
  FuncFParams: ["一个或多个形参，用逗号隔开"],
  FuncFParam: ["一个普通形参，或一个数组形参"],
  FuncRParams: ["一个或多个实参，用逗号隔开"],
  Block: ["大括号中的零个或多个声明、语句"],
  BlockItem: ["语句块里放一条声明", "语句块里放一条可执行语句"],
  Stmt: [
    "给变量或数组元素赋值",
    "一条表达式语句，或单独一个分号",
    "嵌套一个新的大括号语句块",
    "if 判断，else 部分可有可无",
    "while 循环",
    "switch 中放零个或多个 case/default",
    "跳出最近的 while 或 switch",
    "跳到 while 的下一轮",
    "返回，可带返回值也可不带",
    "格式字符串后可跟零个或多个输出值"
  ],
  CaseStmt: ["一个 case 标签及其后续语句", "default 标签及其后续语句"],
  Exp: ["普通算术表达式从加减层开始"],
  Cond: ["if、while 的条件，可包含逻辑运算"],
  LVal: ["一个变量，或一个数组元素"],
  PrimaryExp: ["用括号改变计算顺序", "读取变量、常量或数组元素", "直接使用数字或字符常量"],
  Number: ["整数常量", "字符常量"],
  UnaryExp: ["最基础的表达式", "调用函数，实参可有可无", "对表达式使用 +、- 或 !", "把 int 与 char 显式互转"],
  UnaryOp: ["一元正号", "一元负号", "逻辑非"],
  MulExp: ["只有一个一元表达式", "连续进行乘、除或取模"],
  AddExp: ["只有一个乘除模表达式", "连续进行加法或减法"],
  RelExp: ["不做大小比较", "进行 <、>、<= 或 >= 比较"],
  EqExp: ["不做相等性比较", "进行 == 或 != 比较"],
  LAndExp: ["只有一个相等性表达式", "用 && 连接条件，支持短路"],
  LOrExp: ["只有一个逻辑与表达式", "用 || 连接条件，支持短路"],
  ConstExp: ["编译时就能算出的加减表达式"],
  Ident: ["名字以字母或下划线开始", "名字后继续接字母或下划线", "名字后继续接数字"],
  IntConst: ["非零开头的十进制整数", "整数零"],
  CharConst: ["单引号包围一个普通字符或转义字符"],
  StringConst: ["双引号包围零个或多个字符串字符"]
};

const groups = [
  { label: "程序骨架", nodes: ["CompUnit", "MainFuncDef"] },
  { label: "声明与初始化", nodes: ["Decl", "ConstDecl", "BType", "ConstDef", "ConstInitVal", "VarDecl", "VarDef", "InitVal"] },
  { label: "函数", nodes: ["FuncDef", "FuncType", "FuncFParams", "FuncFParam", "FuncRParams"] },
  { label: "语句与控制流", nodes: ["Block", "BlockItem", "Stmt", "CaseStmt"] },
  { label: "表达式：从入口到优先级", nodes: ["Exp", "Cond", "LVal", "PrimaryExp", "Number", "UnaryExp", "UnaryOp", "MulExp", "AddExp", "RelExp", "EqExp", "LAndExp", "LOrExp", "ConstExp"] },
  { label: "词法单元", nodes: ["Ident", "IntConst", "CharConst", "StringConst"] }
];

const colors = {
  "程序结构": "#26bfd2",
  "声明": "#df9b25",
  "函数": "#438b68",
  "语句": "#d95f4f",
  "表达式": "#7d63c5",
  "词法": "#2582b8"
};

const levelLabels = { C: "基础级", B: "进阶级", A: "短路级" };
const progressStorageKey = "sysy-grammar-coverage-progress-v3";
let current = location.hash.slice(1) in grammar ? location.hash.slice(1) : "CompUnit";
let trail = [current];
let activeLevel = "ALL";
let progressState = {};

try {
  progressState = JSON.parse(localStorage.getItem(progressStorageKey) || "{}");
} catch (error) {
  progressState = {};
}

const els = {
  tree: document.querySelector("#treeNav"),
  search: document.querySelector("#searchInput"),
  breadcrumb: document.querySelector("#breadcrumb"),
  english: document.querySelector("#nodeEnglish"),
  chinese: document.querySelector("#nodeChinese"),
  category: document.querySelector("#categoryPill"),
  level: document.querySelector("#levelBadge"),
  productions: document.querySelector("#productions"),
  childSection: document.querySelector("#childSection"),
  childGrid: document.querySelector("#childGrid"),
  summary: document.querySelector("#plainSummary"),
  why: document.querySelector("#whyItMatters"),
  example: document.querySelector("#codeExample"),
  mustCover: document.querySelector("#mustCover"),
  constraints: document.querySelector("#constraints"),
  sidebar: document.querySelector("#sidebar"),
  mobileNav: document.querySelector("#mobileNav"),
  levelFilter: document.querySelector("#levelFilter"),
  nodeCount: document.querySelector("#nodeCount"),
  currentProgress: document.querySelector("#currentProgress"),
  overallProgress: document.querySelector("#overallProgress"),
  progressTrack: document.querySelector("#progressTrack"),
  progressFill: document.querySelector("#progressFill"),
  progressHint: document.querySelector("#progressHint"),
  resetProgress: document.querySelector("#resetProgress")
};

function progressKey(name, index) {
  return name + "::" + index;
}

function completedFor(name) {
  return coverageRequirements[name].reduce(function (count, _, index) {
    return count + (progressState[progressKey(name, index)] ? 1 : 0);
  }, 0);
}

function saveProgress() {
  try {
    localStorage.setItem(progressStorageKey, JSON.stringify(progressState));
  } catch (error) {
    els.progressHint.textContent = "浏览器禁止了本地存储，本次勾选只在当前页面有效。";
  }
}

function renderProgress() {
  const names = Object.keys(coverageRequirements);
  const total = names.reduce(function (count, name) {
    return count + coverageRequirements[name].length;
  }, 0);
  const completed = names.reduce(function (count, name) {
    return count + completedFor(name);
  }, 0);
  const percent = total ? Math.round(completed / total * 100) : 0;

  els.overallProgress.textContent = completed + " / " + total;
  els.progressFill.style.width = percent + "%";
  els.progressTrack.setAttribute("aria-valuenow", String(percent));
  els.progressTrack.setAttribute("aria-label", "全部文法覆盖进度 " + percent + "%");
  els.progressHint.textContent = completed === total
    ? "全部覆盖项已完成，可以进行提交前总检查。"
    : "还剩 " + (total - completed) + " 项；勾选会自动保存在本浏览器。";

  const currentDone = completedFor(current);
  els.currentProgress.textContent = currentDone + " / " + coverageRequirements[current].length + " 已完成";
}

function suggestedTest(name, text, index) {
  const lower = (name + " " + text).toLowerCase();

  if (/mainfuncdef|唯一的 main|main 位于/.test(lower)) return "testfile1-6";
  if (grammar[name].level === "A" || /短路|&&|\|\|/.test(text)) return "testfile5-6";
  if (/printf 只有 StringConst/.test(text)) return "testfile1";
  if (/数组|一维|\[\]|ident\[exp\]/i.test(text)) return "testfile3";
  if (/char|stringconst|switch|case|default|%c|%s|ascii|显式类型转换/i.test(lower)) return "testfile4";
  if (grammar[name].level === "B") return "testfile3-4";
  if (/static|至少 3|多个|多位|后续包含/.test(text)) return "testfile2";
  if (/完全不出现|空语句|空表达式|空语句块|无形参|省略|不带 else|无初值|不出现/.test(text)) return "testfile1";
  return index % 2 === 0 ? "testfile1" : "testfile2";
}

function tokenise(text) {
  const names = Object.keys(grammar).sort(function (a, b) { return b.length - a.length; });
  const pattern = new RegExp("(" + names.join("|") + "|'[^']*'|\\[|\\]|\\{|\\}|\\||Ident)", "g");
  return text.split(pattern).map(function (token) { return token.trim(); }).filter(Boolean);
}

function childNames(itemName) {
  const found = [];
  grammar[itemName].productions.forEach(function (production) {
    tokenise(production).forEach(function (token) {
      if (grammar[token] && token !== itemName && !found.includes(token)) found.push(token);
    });
  });
  return found;
}

function updateGrammarTokenCompletion(button, name) {
  const complete = completedFor(name) === coverageRequirements[name].length;
  button.classList.toggle("completed", complete);
  let badge = button.querySelector(".token-check");

  if (complete && !badge) {
    badge = document.createElement("span");
    badge.className = "token-check";
    badge.textContent = "✓";
    badge.setAttribute("aria-hidden", "true");
    button.append(badge);
  } else if (!complete && badge) {
    badge.remove();
  }
}

function refreshGrammarTokenCompletion() {
  document.querySelectorAll(".grammar-token[data-node]").forEach(function (button) {
    updateGrammarTokenCompletion(button, button.dataset.node);
  });
}

function highestProductionLevel(name, production) {
  const rank = { C: 0, B: 1, A: 2 };
  const levels = [grammar[name].level];

  tokenise(production).forEach(function (token) {
    if (grammar[token]) levels.push(grammar[token].level);
  });

  if (
    /'char'|CharConst|StringConst|CaseStmt|'switch'/.test(production) ||
    production.includes("'['") ||
    ((name === "ConstInitVal" || name === "InitVal") && production.includes("'{'"))
  ) {
    levels.push("B");
  }
  if (/LAndExp|LOrExp|'&&'|'\|\|'/.test(production)) levels.push("A");

  return levels.reduce(function (highest, level) {
    return rank[level] > rank[highest] ? level : highest;
  }, "C");
}

function renderProduction(name, production, index) {
  const row = document.createElement("div");
  row.className = "production-row";

  const lhs = document.createElement("div");
  lhs.className = "production-lhs";
  lhs.textContent = name;
  const arrow = document.createElement("div");
  arrow.className = "production-arrow";
  arrow.textContent = "→";
  const rhs = document.createElement("div");
  rhs.className = "production-rhs";
  const expression = document.createElement("div");
  expression.className = "production-expression";
  const hint = document.createElement("div");
  hint.className = "production-hint";
  const hintCopy = document.createElement("span");
  hintCopy.textContent = productionHints[name][index];
  const productionLevel = highestProductionLevel(name, production);
  const levelBadge = document.createElement("span");
  levelBadge.className = "production-level level-" + productionLevel.toLowerCase();
  levelBadge.textContent = "最高 " + productionLevel;
  levelBadge.setAttribute("aria-label", "此产生式直接包含的最高难度为 " + productionLevel + " 级");
  hint.append(hintCopy, levelBadge);

  tokenise(production).forEach(function (token) {
    if (grammar[token]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "grammar-token";
      button.textContent = token;
      button.dataset.node = token;
      button.dataset.tooltip = grammar[token].zh + " · 点击展开";
      button.setAttribute("aria-label", "打开 " + token + "：" + grammar[token].zh);
      updateGrammarTokenCompletion(button, token);
      button.addEventListener("click", function () { navigate(token); });
      rhs.append(button);
    } else {
      const span = document.createElement("span");
      span.textContent = token;
      span.className = token.charAt(0) === "'" ? "grammar-terminal" : /[\[\]{}|]/.test(token) ? "grammar-meta" : "";
      rhs.append(span);
    }
  });

  expression.append(rhs, hint);
  row.append(lhs, arrow, expression);
  return row;
}

function matchesQuery(name, query) {
  const item = grammar[name];
  const haystack = [name, item.zh, item.category, item.summary, item.why, item.productions.join(" "), item.constraints.join(" ")].join(" ").toLowerCase();
  return !query || haystack.includes(query);
}

function renderTree(queryValue) {
  const query = (queryValue || "").trim().toLowerCase();
  els.tree.innerHTML = "";
  let count = 0;

  groups.forEach(function (group) {
    const names = group.nodes.filter(function (name) {
      const levelMatches = activeLevel === "ALL" || grammar[name].level === activeLevel;
      return levelMatches && matchesQuery(name, query);
    });
    if (!names.length) return;
    count += names.length;

    const section = document.createElement("section");
    section.className = "tree-group";
    const heading = document.createElement("h2");
    heading.textContent = group.label;
    section.append(heading);

    const list = document.createElement("div");
    list.className = "tree-list";
    names.forEach(function (name) {
      const item = grammar[name];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tree-node" + (name === current ? " active" : "");
      button.style.setProperty("--node-color", colors[item.category]);
      const complete = completedFor(name) === coverageRequirements[name].length;
      if (complete) {
        button.classList.add("completed");
        button.setAttribute("aria-label", name + " " + item.zh + "，覆盖要求已全部完成");
      }

      const dot = document.createElement("span");
      dot.className = "dot";
      const labels = document.createElement("span");
      labels.textContent = name;
      const zh = document.createElement("small");
      zh.textContent = item.zh;
      labels.append(zh);
      const level = document.createElement("small");
      level.textContent = item.level;
      button.append(dot, labels, level);
      button.addEventListener("click", function () { navigate(name); });
      list.append(button);
    });
    section.append(list);
    els.tree.append(section);
  });

  els.nodeCount.textContent = "显示 " + count + " / " + Object.keys(grammar).length + " 个节点";
  if (!count) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "没有匹配的文法节点。换个中文或英文关键词试试。";
    els.tree.append(empty);
  }
}

function renderBreadcrumb() {
  els.breadcrumb.innerHTML = "";
  trail.forEach(function (name, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.addEventListener("click", function () {
      trail = trail.slice(0, index + 1);
      current = name;
      render();
    });
    els.breadcrumb.append(button);
    if (index < trail.length - 1) {
      const divider = document.createElement("span");
      divider.textContent = "/";
      els.breadcrumb.append(divider);
    }
  });
}

function renderChildren() {
  const names = childNames(current);
  els.childGrid.innerHTML = "";
  if (!names.length) {
    const empty = document.createElement("div");
    empty.className = "child-empty";
    empty.textContent = "已经到达词法叶子节点。可以回到上方路径，或从左侧选择其他规则。";
    els.childGrid.append(empty);
    return;
  }
  names.forEach(function (name) {
    const item = grammar[name];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "child-card";
    button.style.setProperty("--child-color", colors[item.category]);
    const rail = document.createElement("span");
    rail.className = "rail";
    const labels = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = name;
    const small = document.createElement("small");
    small.textContent = item.zh + " · " + item.summary;
    labels.append(strong, small);
    const level = document.createElement("span");
    level.className = "child-level";
    level.textContent = item.level;
    button.append(rail, labels, level);
    button.addEventListener("click", function () { navigate(name); });
    els.childGrid.append(button);
  });
}

function navigate(name, replaceHash) {
  if (!grammar[name]) return;
  current = name;
  const existing = trail.indexOf(name);
  trail = existing >= 0 ? trail.slice(0, existing + 1) : trail.concat(name);
  if (replaceHash) {
    window.history.replaceState(null, "", "#" + name);
  } else if (location.hash !== "#" + name) {
    window.history.pushState(null, "", "#" + name);
  }
  render();
  if (window.innerWidth <= 760) {
    els.sidebar.classList.remove("open");
    els.mobileNav.setAttribute("aria-expanded", "false");
  }
}

function render() {
  const item = grammar[current];
  const accent = colors[item.category];
  document.documentElement.style.setProperty("--cyan", accent);
  els.english.textContent = current;
  els.chinese.textContent = item.zh;
  els.category.textContent = item.category;
  els.level.innerHTML = "";
  const levelCode = document.createElement("strong");
  levelCode.textContent = item.level;
  const levelText = document.createElement("span");
  levelText.textContent = levelLabels[item.level];
  els.level.append(levelCode, levelText);

  els.productions.innerHTML = "";
  item.productions.forEach(function (production, index) {
    els.productions.append(renderProduction(current, production, index));
  });

  els.summary.textContent = item.summary;
  els.why.textContent = item.why;
  els.example.textContent = item.example;
  els.mustCover.innerHTML = "";
  coverageRequirements[current].forEach(function (text, index) {
    const li = document.createElement("li");
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const copy = document.createElement("span");
    const requirementText = document.createElement("span");
    const recommendation = document.createElement("small");
    const key = progressKey(current, index);

    checkbox.type = "checkbox";
    checkbox.checked = Boolean(progressState[key]);
    checkbox.setAttribute("aria-label", current + "：" + text);
    copy.className = "requirement-copy";
    requirementText.className = "requirement-text";
    requirementText.textContent = text;
    recommendation.className = "requirement-test";
    recommendation.textContent = "建议 " + suggestedTest(current, text, index);
    copy.append(requirementText, recommendation);
    li.classList.toggle("done", checkbox.checked);

    checkbox.addEventListener("change", function () {
      if (checkbox.checked) {
        progressState[key] = true;
      } else {
        delete progressState[key];
      }
      li.classList.toggle("done", checkbox.checked);
      saveProgress();
      renderProgress();
      renderTree(els.search.value);
      refreshGrammarTokenCompletion();
    });

    label.append(checkbox, copy);
    li.append(label);
    els.mustCover.append(li);
  });
  els.constraints.innerHTML = "";
  item.constraints.forEach(function (text) {
    const li = document.createElement("li");
    li.textContent = text;
    els.constraints.append(li);
  });

  renderBreadcrumb();
  renderChildren();
  renderProgress();
  renderTree(els.search.value);
}

els.search.addEventListener("input", function (event) {
  renderTree(event.target.value);
});

els.levelFilter.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-level]");
  if (!button) return;
  activeLevel = button.dataset.level;
  els.levelFilter.querySelectorAll("button").forEach(function (item) {
    item.classList.toggle("active", item === button);
  });
  renderTree(els.search.value);
});

document.addEventListener("keydown", function (event) {
  if (event.key === "/" && document.activeElement !== els.search) {
    event.preventDefault();
    els.search.focus();
  }
  if (event.key === "Escape" && document.activeElement === els.search) {
    els.search.value = "";
    els.search.blur();
    renderTree("");
  }
});

els.mobileNav.addEventListener("click", function () {
  const open = els.sidebar.classList.toggle("open");
  els.mobileNav.setAttribute("aria-expanded", String(open));
});

els.resetProgress.addEventListener("click", function () {
  const confirmed = window.confirm("确定清空全部文法覆盖勾选吗？此操作只影响当前浏览器中的学习进度。");
  if (!confirmed) return;
  progressState = {};
  try {
    localStorage.removeItem(progressStorageKey);
  } catch (error) {
    // 即使浏览器禁用存储，也仍然清空当前页面的状态。
  }
  render();
});

window.addEventListener("popstate", function () {
  const name = location.hash.slice(1);
  if (grammar[name]) {
    current = name;
    if (!trail.includes(name)) trail.push(name);
    render();
  }
});

render();
