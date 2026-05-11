import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const getImg = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&w=800`;

async function main() {
    const authenticNames = [
        "ศูนย์คอมพิวเตอร์ มหาวิทยาลัยราชภัฏเลย",
        "มหาลัยราชภัฎเลย",
        "ศูนย์วิทยบริการ มหาวิทยาลัยราชภัฏเลย",
        "ตึก 18 สำนักวิชาการและงานทะเบียน มหาวิทยาลัยราชภัฏเลย",
        "สำนักวิทยบริการและเทคโนโลยีสารสนเทศ มหาวิทยาลัยราชภัฏเลย"
    ];

    console.log("\n─── Step 0: Cleaning up obsolete pins ───");
    // Automatically purge any pin that is NOT in our authentic list
    try {
        await prisma.asset.updateMany({
            where: { mapPin: { name: { notIn: authenticNames } } },
            data: { mapPinId: null }
        });
        const deleteResult = await prisma.mapPin.deleteMany({
            where: { name: { notIn: authenticNames } }
        });
        console.log(`✓ Removed ${deleteResult.count} obsolete pins.`);
    } catch (e: any) {
        console.log("× Cleanup error:", e.message);
    }

    console.log("\n─── Step 1: Seeding 5 Core Authentic Map Pins ───");

    const pins = [
        {
            name: "ศูนย์คอมพิวเตอร์ มหาวิทยาลัยราชภัฏเลย",
            latitude: 17.539381592174248,
            longitude: 101.71942328686409,
            description: "ศูนย์คอมพิวเตอร์หลัก มรภ.เลย (ตึกคอม)",
            type: "building",
            imageUrl: "https://cc.lru.ac.th/th/wp-content/uploads/2020/10/DSC_0272-768x519-1.png",
            cardImageUrl: "https://cc.lru.ac.th/th/wp-content/uploads/2020/10/DSC_0272-768x519-1.png",
            pinImageUrl: "https://cc.lru.ac.th/th/wp-content/uploads/2020/10/DSC_0272-768x519-1.png"
        },
        {
            name: "มหาลัยราชภัฎเลย",
            latitude: 17.538574384604214,
            longitude: 101.72132315763594,
            description: "มหาวิทยาลัยราชภัฏเลย (อาคารเรียนรวม)",
            type: "building",
            imageUrl: "https://academic.lru.ac.th/th/wp-content/uploads/2019/04/3-800x445.jpg",
            cardImageUrl: "https://academic.lru.ac.th/th/wp-content/uploads/2019/04/3-800x445.jpg",
            pinImageUrl: "https://academic.lru.ac.th/th/wp-content/uploads/2019/04/3-800x445.jpg"
        },
        {
            name: "ศูนย์วิทยบริการ มหาวิทยาลัยราชภัฏเลย",
            latitude: 17.54087416017252,
            longitude: 101.72211029266894,
            description: "หอสมุดและศูนย์วิทยบริการ",
            type: "building",
            imageUrl: "https://academic.lru.ac.th/th/wp-content/uploads/2019/04/1-800x445.jpg",
            cardImageUrl: "https://academic.lru.ac.th/th/wp-content/uploads/2019/04/1-800x445.jpg",
            pinImageUrl: "https://academic.lru.ac.th/th/wp-content/uploads/2019/04/1-800x445.jpg"
        },
        {
            name: "ตึก 18 สำนักวิชาการและงานทะเบียน มหาวิทยาลัยราชภัฏเลย",
            latitude: 17.538743745034942,
            longitude: 101.72116108226383,
            description: "สำนักวิชาการและงานทะเบียน (อาคาร 18)",
            type: "building",
            imageUrl: "https://academic.lru.ac.th/th/wp-content/uploads/2019/04/6-800x445.jpg",
            cardImageUrl: "https://academic.lru.ac.th/th/wp-content/uploads/2019/04/6-800x445.jpg",
            pinImageUrl: "https://academic.lru.ac.th/th/wp-content/uploads/2019/04/6-800x445.jpg"
        },
        {
            name: "สำนักวิทยบริการและเทคโนโลยีสารสนเทศ มหาวิทยาลัยราชภัฏเลย",
            latitude: 17.539450751278565,
            longitude: 101.71969716886755,
            description: "สำนักวิทยบริการและเทคโนโลยีสารสนเทศ (ARIT)",
            type: "server",
            imageUrl: "https://scontent.fbkk29-1.fna.fbcdn.net/v/t39.30808-6/482217926_1191014732715399_653992333148398326_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=2a1932&_nc_ohc=j8GvcfXKNfYQ7kNvwHEJgJ2&_nc_oc=Adr2lcCjU74tOIpaG0_waljVkfHld3IBAfffGFtqlzIyvMdkcinduwP1G008Ltix6hpqm7p7-uiZ1_KRg10s-on_&_nc_zt=23&_nc_ht=scontent.fbkk29-1.fna&_nc_gid=sKns5tRhQAm_crKP2-Dk1Q&_nc_ss=7b2a8&oh=00_Af5VFbHq8ZObIRPKlYYEpyJ2KPVtUnOTTnqkrjUmsvHxUg&oe=6A07CE22",
            cardImageUrl: "https://scontent.fbkk29-1.fna.fbcdn.net/v/t39.30808-6/482217926_1191014732715399_653992333148398326_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=2a1932&_nc_ohc=j8GvcfXKNfYQ7kNvwHEJgJ2&_nc_oc=Adr2lcCjU74tOIpaG0_waljVkfHld3IBAfffGFtqlzIyvMdkcinduwP1G008Ltix6hpqm7p7-uiZ1_KRg10s-on_&_nc_zt=23&_nc_ht=scontent.fbkk29-1.fna&_nc_gid=sKns5tRhQAm_crKP2-Dk1Q&_nc_ss=7b2a8&oh=00_Af5VFbHq8ZObIRPKlYYEpyJ2KPVtUnOTTnqkrjUmsvHxUg&oe=6A07CE22",
            pinImageUrl: "https://scontent.fbkk29-1.fna.fbcdn.net/v/t39.30808-6/482217926_1191014732715399_653992333148398326_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=2a1932&_nc_ohc=j8GvcfXKNfYQ7kNvwHEJgJ2&_nc_oc=Adr2lcCjU74tOIpaG0_waljVkfHld3IBAfffGFtqlzIyvMdkcinduwP1G008Ltix6hpqm7p7-uiZ1_KRg10s-on_&_nc_zt=23&_nc_ht=scontent.fbkk29-1.fna&_nc_gid=sKns5tRhQAm_crKP2-Dk1Q&_nc_ss=7b2a8&oh=00_Af5VFbHq8ZObIRPKlYYEpyJ2KPVtUnOTTnqkrjUmsvHxUg&oe=6A07CE22"
        }
    ];

    const pinMap: Record<string, { id: string, lat: number, lng: number }> = {};

    for (const p of pins) {
        try {
            const created = await prisma.mapPin.upsert({
                where: { name: p.name },
                update: p,
                create: p
            });
            pinMap[p.name] = { id: created.id, lat: p.latitude, lng: p.longitude };
            console.log(`✓ MapPin: ${p.name}`);
        } catch (e: any) {
            console.log(`× Pin ${p.name} error:`, e.message);
        }
    }

    console.log("\n─── Step 2: Seeding 60 Unique Authentic Assets across 5 Locations ───");

    const imgPC = getImg("1499951360447-b19be8fe80f5");
    const imgNB = getImg("1517336714731-489689fd1ca8");
    const imgSR = getImg("1550751827-4bd374c3f58b");
    const imgNet = getImg("1544197150-b99a580bb7a8");
    const imgFurn = getImg("1505843490538-5133c6c7d0e1");
    const imgOffice = getImg("1497215728101-856f4ea42174");

    const assetTemplates = [
        { name: "เครื่องคอมพิวเตอร์ประมวลผลสูง (Workstation)", type: "durable", unit: "เครื่อง", img: imgPC, dept: "ศูนย์คอมพิวเตอร์", basePrice: 350000, priceVar: 200000 },
        { name: "เครื่องคอมพิวเตอร์โน้ตบุ๊ก (Business Laptop)", type: "durable", unit: "เครื่อง", img: imgNB, dept: "ศูนย์คอมพิวเตอร์", basePrice: 120000, priceVar: 130000 },
        { name: "ตู้เก็บอุปกรณ์เครือข่าย (Server Rack 42U)", type: "durable", unit: "ตู้", img: imgSR, dept: "สำนักวิทยบริการและเทคโนโลยีสารสนเทศ", basePrice: 250000, priceVar: 200000 },
        { name: "อุปกรณ์กระจายสัญญาณเครือข่าย (Core Switch)", type: "durable", unit: "เครื่อง", img: imgNet, dept: "สำนักวิทยบริการและเทคโนโลยีสารสนเทศ", basePrice: 1500000, priceVar: 3000000 },
        { name: "เก้าอี้ทำงานบริหาร (Executive Chair)", type: "durable", unit: "ตัว", img: imgFurn, dept: "ศูนย์วิทยบริการ", basePrice: 45000, priceVar: 40000 },
        { name: "โต๊ะทำงานพร้อมลิ้นชัก (Office Desk)", type: "durable", unit: "ตัว", img: imgOffice, dept: "ศูนย์วิทยบริการ", basePrice: 35000, priceVar: 30000 },
        { name: "หมึกพิมพ์เลเซอร์ (Laser Toner Cartridge)", type: "general", unit: "ตลับ", img: imgOffice, dept: "ตึก 18 สำนักวิชาการและงานทะเบียน", basePrice: 15000, priceVar: 20000 },
        { name: "เครื่องสำรองไฟฟ้าขนาดใหญ่ (UPS 5kVA)", type: "durable", unit: "เครื่อง", img: imgNet, dept: "สำนักวิทยบริการและเทคโนโลยีสารสนเทศ", basePrice: 450000, priceVar: 400000 },
        { name: "เมาส์และคีย์บอร์ดไร้สาย (Wireless Bundle)", type: "general", unit: "ชุด", img: imgPC, dept: "ศูนย์คอมพิวเตอร์", basePrice: 8500, priceVar: 6500 },
        { name: "กระดาษถ่ายเอกสาร A4 (80 แกรม)", type: "general", unit: "รีม", img: imgOffice, dept: "ตึก 18 สำนักวิชาการและงานทะเบียน", basePrice: 1500, priceVar: 2000 },
        { name: "ตู้เหล็กเก็บเอกสาร 4 ลิ้นชัก", type: "durable", unit: "ตู้", img: imgFurn, dept: "ศูนย์วิทยบริการ", basePrice: 15000, priceVar: 20000 },
        { name: "อุปกรณ์กระจายสัญญาณไร้สาย (Access Point)", type: "durable", unit: "เครื่อง", img: imgNet, dept: "สำนักวิทยบริการและเทคโนโลยีสารสนเทศ", basePrice: 45000, priceVar: 50000 },
        { name: "แฟลชไดรฟ์ 64GB (High Speed)", type: "general", unit: "ชิ้น", img: imgPC, dept: "ศูนย์คอมพิวเตอร์", basePrice: 2500, priceVar: 3000 },
        { name: "ชุดโต๊ะประชุมพร้อมเก้าอี้ (Meeting Set)", type: "durable", unit: "ชุด", img: imgFurn, dept: "ศูนย์วิทยบริการ", basePrice: 850000, priceVar: 1650000 },
        { name: "หูฟังสำหรับการประชุม (USB Headset)", type: "general", unit: "อัน", img: imgNB, dept: "ศูนย์คอมพิวเตอร์", basePrice: 5500, priceVar: 7000 },
        { name: "กล้องวิดีโอสำหรับการประชุม (Conference Cam)", type: "durable", unit: "ชุด", img: imgPC, dept: "ศูนย์คอมพิวเตอร์", basePrice: 450000, priceVar: 500000 },
        { name: "แผ่นรองเมาส์แบบยาว (Desk Mat)", type: "general", unit: "แผ่น", img: imgPC, dept: "ศูนย์คอมพิวเตอร์", basePrice: 1500, priceVar: 2000 },
        { name: "เครื่องจัดเก็บข้อมูลบนเครือข่าย (NAS Storage)", type: "durable", unit: "เครื่อง", img: imgSR, dept: "สำนักวิทยบริการและเทคโนโลยีสารสนเทศ", basePrice: 850000, priceVar: 2650000 },
        { name: "สายชาร์จโน้ตบุ๊กสำรอง (Universal Adapter)", type: "general", unit: "ชิ้น", img: imgNB, dept: "มหาลัยราชภัฎเลย", basePrice: 3500, priceVar: 3000 },
        { name: "พัดลมตั้งโต๊ะขนาดเล็ก (Mini Desk Fan)", type: "general", unit: "เครื่อง", img: imgFurn, dept: "มหาลัยราชภัฎเลย", basePrice: 1500, priceVar: 2000 }
    ];

    const assetLocations = pins.map(p => p.name);
    
    // Helper function to shuffle array
    const shuffle = (array: any[]) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    // Status distribution: randomized
    const statuses = shuffle([
        ...Array(27).fill("ใช้งานได้"),
        ...Array(17).fill("ชำรุด"),
        ...Array(10).fill("เสื่อมสภาพ"),
        ...Array(4).fill("สูญหาย"),
        ...Array(2).fill("ไม่จำเป็นต้องใช้ในราชการ")
    ]);

    // Money type distribution: randomized
    const moneyTypes = shuffle([
        ...Array(15).fill("งบประมาณแผ่นดิน"),
        ...Array(10).fill("เงินรายได้"),
        ...Array(8).fill("เงินบริจาค"),
        ...Array(6).fill("บ.กศ. 650015035"),
        ...Array(5).fill("เงินรายได้ ศูนย์คอมพิวเตอร์"),
        ...Array(4).fill("เงินศูนย์คอม อ.วินัย"),
        ...Array(4).fill("งบแผ่นดิน 669215004"),
        ...Array(3).fill("คงคลัง 650925002"),
        ...Array(2).fill("เงินเหลื่อมปีคงคลัง ปี 63 649915004"),
        ...Array(2).fill("ศูนย์คอมพิวเตอร์"),
        ...Array(1).fill("เงินศูนย์คอม อ.ภาณุพงษ์")
    ]);

    // Acquisition method distribution: randomized
    const methods = shuffle([
        ...Array(30).fill("เฉพาะเจาะจง"),
        ...Array(20).fill("ประกวดราคา"),
        ...Array(10).fill("ตกลงราคา")
    ]);

    for (let i = 1; i <= 60; i++) {
        // Pick a template (looping 20 templates three times to get 60 items)
        const template = assetTemplates[(i - 1) % assetTemplates.length];
        
        // Distribute assets among 5 pins (12 assets per pin)
        const locIndex = Math.floor((i - 1) / 12);
        const loc = assetLocations[locIndex];
        const pinInfo = pinMap[loc];
        
        const assetCode = `14.${i.toString().padStart(2, '0')}.01/66`;
        const status = statuses[i - 1];
        const moneyType = moneyTypes[i - 1];
        const method = methods[i - 1];

        // Randomize Date between 2021 and 2024
        const year = 2021 + Math.floor(Math.random() * 4);
        const month = Math.floor(Math.random() * 12);
        const day = Math.floor(Math.random() * 28) + 1;
        const receivedDate = new Date(year, month, day);
        const fiscalYear = (year + 543).toString();

        // Grandiose Pricing Logic - Target ~40M total
        const unitPrice = Math.floor(template.basePrice + (Math.random() * template.priceVar));

        // Generate Unique Remark
        const rooms = ["101", "202", "305", "410", "LAB-A", "LAB-B", "SERVER-RM", "OFFICE-C"];
        const inspectors = ["นายสุรสิทธิ์", "นางสาววิไล", "นายสมชาย", "นางมาลี"];
        const room = rooms[i % rooms.length];
        const inspector = inspectors[i % inspectors.length];
        const remark = `ตรวจรับโดย ${inspector} ประจำห้อง ${room} [REF-${Math.random().toString(36).substring(7).toUpperCase()}] - สภาพ${status}`;

        try {
            const existingAsset = await prisma.asset.findUnique({ where: { assetCode } });
            if (existingAsset) {
                await prisma.assetImage.deleteMany({ where: { assetId: existingAsset.id } });
            }

            await prisma.asset.upsert({
                where: { assetCode },
                update: {
                    name: template.name + (i > 40 ? " (ชุดที่ 3)" : i > 20 ? " (ชุดที่ 2)" : ""),
                    assetType: template.type,
                    status: status,
                    quantity: 1,
                    unit: template.unit,
                    unitPrice: unitPrice,
                    fiscalYear: fiscalYear,
                    acquisitionMethod: method,
                    moneyType: moneyType,
                    department: template.dept,
                    location: loc,
                    receivedBy: "นายวิชัย มั่นคง",
                    createdBy: "นายสุรสิทธิ์ พิมพ์สีดา",
                    receivedDate: receivedDate,
                    remark: remark,
                    imageUrl: template.img,
                    latitude: pinInfo ? pinInfo.lat : null,
                    longitude: pinInfo ? pinInfo.lng : null,
                    mapPinId: pinInfo ? pinInfo.id : null,
                    images: {
                        create: [{ url: template.img }]
                    }
                },
                create: {
                    name: template.name + (i > 40 ? " (ชุดที่ 3)" : i > 20 ? " (ชุดที่ 2)" : ""),
                    assetCode,
                    assetType: template.type,
                    status: status,
                    quantity: 1,
                    unit: template.unit,
                    unitPrice: unitPrice,
                    fiscalYear: fiscalYear,
                    acquisitionMethod: method,
                    moneyType: moneyType,
                    department: template.dept,
                    location: loc,
                    receivedBy: "นายวิชัย มั่นคง",
                    createdBy: "นายสุรสิทธิ์ พิมพ์สีดา",
                    receivedDate: receivedDate,
                    remark: remark,
                    imageUrl: template.img,
                    latitude: pinInfo ? pinInfo.lat : null,
                    longitude: pinInfo ? pinInfo.lng : null,
                    mapPinId: pinInfo ? pinInfo.id : null,
                    images: {
                        create: [{ url: template.img }]
                    }
                }
            });
        } catch (err: any) { }
    }
    console.log("\n✅ FULL CAMPUS SYNC COMPLETE!");
    console.log("5 Authentic Pins & 60 Distributed Assets are ready.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
