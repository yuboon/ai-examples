package com.example.mcpdemo.tool;

import cn.hutool.json.JSONUtil;

import java.util.*;

/**
 * ISON生成解析Java简易实现
 * https://github.com/ISON-format/ison
 */
public class IsonUtils {

    /**
     * 解析ISON表格格式为List<Map>
     */
    public static List<Map<String, Object>> parseTable(String isonText) {
        List<Map<String, Object>> results = new ArrayList<>();
        String[] lines = isonText.trim().split("\n");

        // 第一行是表名，跳过
        // 第二行是字段定义
        String[] headers = lines[1].split(" ");

        // 后续行是数据
        for (int i = 2; i < lines.length; i++) {
            String[] values = lines[i].split(" ");
            Map<String, Object> row = new LinkedHashMap<>();
            for (int j = 0; j < headers.length; j++) {
                String header = headers[j].split(":")[0]; // 去掉类型注解
                row.put(header, parseValue(values[j]));
            }
            results.add(row);
        }
        return results;
    }

    /**
     * 生成ISON表格格式字符串
     */
    public static String generateTable(String tableName,
                                       List<String> headers,
                                       List<List<Object>> rows) {
        StringBuilder sb = new StringBuilder();
        sb.append("table.").append(tableName).append("\n");
        sb.append(String.join(" ", headers)).append("\n");

        for (List<Object> row : rows) {
            List<String> formatted = new ArrayList<>();
            for (Object val : row) {
                formatted.add(formatValue(val));
            }
            sb.append(String.join(" ", formatted)).append("\n");
        }
        return sb.toString();
    }

    private static Object parseValue(String val) {
        if (val.equals("true")) return true;
        if (val.equals("false")) return false;
        if (val.equals("null")) return null;
        if (val.startsWith(":")) return val; // 引用
        try {
            return Integer.parseInt(val);
        } catch (NumberFormatException e) {
            try {
                return Double.parseDouble(val);
            } catch (NumberFormatException e2) {
                return val.replace("\"", ""); // 去掉引号
            }
        }
    }

    private static String formatValue(Object val) {
        if (val == null) return "null";
        if (val instanceof Boolean) return val.toString();
        if (val instanceof Number) return val.toString();
        String str = val.toString();
        // 包含空格或是保留字时加引号
        if (str.contains(" ") || str.contains("\t") ||
            str.equals("true") || str.equals("false") || str.equals("null")) {
            return "\"" + str + "\"";
        }
        return str;
    }

    public static void main(String[] args) {
        String ison = """
            table.users
            id:int name:string email
            1 Alice alice@example.com
            2 Bob bob@example.com
            """;
        List<Map<String, Object>> users = IsonUtils.parseTable(ison);
        System.err.println(JSONUtil.toJsonStr(users));


        // 使用示例：生成
        List<String> headers = Arrays.asList("id:int", "name:string", "email");
        List<List<Object>> rows = Arrays.asList(
                Arrays.asList(1, "Alice", "alice@example.com"),
                Arrays.asList(2, "Bob", "bob@example.com")
        );
        String isonOutput = IsonUtils.generateTable("users", headers, rows);

        System.err.println(isonOutput);
    }
}