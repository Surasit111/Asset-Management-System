"use client";

import React, { memo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    ResponsiveContainer, Tooltip, Cell,
} from "recharts";

interface DataItem {
    name: string;
    value: number;
}

interface RechartsWrapperProps {
    data: DataItem[] | undefined;
    type?: string;
    getBarColor: (name: string, type: string, idx: number, total: number) => string;
    isMoney?: boolean;
}

function RechartsWrapperInner({ data, type, getBarColor, isMoney = false }: RechartsWrapperProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-sm text-gray-300">
                ยังไม่มีข้อมูล
            </div>
        );
    }

    if (isMoney) {
        return (
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
                <BarChart
                    data={data}
                    margin={{ top: 8, right: 8, left: 0, bottom: 80 }}
                    accessibilityLayer={false}
                    style={{ outline: "none", border: "none" }}
                    tabIndex={-1}
                >
                    <CartesianGrid stroke="#e2e8f0" vertical={false} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        tick={(props: any) => {
                            const { x, y, payload } = props;
                            const numericX = Number(x);
                            const numericY = Number(y);
                            return (
                                <text
                                    x={numericX}
                                    y={numericY + 4}
                                    transform={`rotate(-45, ${numericX}, ${numericY + 4})`}
                                    textAnchor="end"
                                    fill="#475569"
                                    fontSize={11}
                                    fontWeight={600}
                                >
                                    {payload.value}
                                </text>
                            );
                        }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#475569" }}
                        allowDecimals={false}
                    />
                    <Tooltip
                        cursor={false}
                        contentStyle={{
                            borderRadius: "0.75rem",
                            border: "1px solid #e2e8f0",
                            fontSize: "0.8125rem",
                        }}
                        formatter={(val) => [val, "จำนวน"]}
                        animationDuration={0}
                    />
                    <Bar
                        dataKey="value"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                        isAnimationActive={false}
                    >
                        {data.map((e, i) => (
                            <Cell key={i} fill={getBarColor(e.name, "money", i, data.length)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
            <BarChart
                data={data}
                barCategoryGap="15%"
                accessibilityLayer={false}
                style={{ outline: "none", border: "none" }}
                tabIndex={-1}
            >
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
                    padding={{ left: 20, right: 20 }}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#475569" }}
                    allowDecimals={false}
                />
                <Tooltip
                    cursor={false}
                    contentStyle={{
                        borderRadius: "0.75rem",
                        border: "1px solid #e2e8f0",
                        fontSize: "0.8125rem",
                    }}
                    formatter={(val) => [val, "จำนวน"]}
                    animationDuration={0}
                />
                <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                    isAnimationActive={false}
                >
                    {data.map((e, i) => (
                        <Cell key={i} fill={getBarColor(e.name, type ?? "status", i, data.length)} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

// Custom comparator: re-render เฉพาะเมื่อ data หรือ type เปลี่ยนจริงๆ
// ตัด collapsed ออก และไม่เปรียบ getBarColor (stable module-level function)
export default memo(RechartsWrapperInner, (prev, next) =>
    prev.data === next.data &&
    prev.type === next.type &&
    prev.isMoney === next.isMoney
);