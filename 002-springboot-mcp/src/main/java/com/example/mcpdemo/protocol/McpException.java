package com.example.mcpdemo.protocol;

public class McpException extends RuntimeException {
    private final int code;
    private final Object data;

    public McpException(int code, String message) {
        this(code, message, null);
    }

    public McpException(int code, String message, Object data) {
        super(message);
        this.code = code;
        this.data = data;
    }

    public int getCode() {
        return code;
    }

    public Object getData() {
        return data;
    }
}
