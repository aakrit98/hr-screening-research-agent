import {v2 as cloudinary} from "cloudinary"; 
import {CloudinaryStorage} from "multer-storage-cloudinary";


cloudinary.config({ 
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME , 
    api_key : process.env.CLOUDINARY_API_KEY , 
    api_secret : process.env.CLOUDINARY_API_SECRET ,  

});


//tells multer to upload directly to cloudinary instead of local disk 

const storage = new CloudinaryStorage ({ 
    cloudinary : cloudinary , 
    params : { 
        folder : "hr-screening-cvs" , 
        resource_type : "raw" , 
        allowed_formats : ["pdf"],
    },
});


export {cloudinary , storage};