console.log("tudo ok")

// window.onload = function () {
//     document.getElementById("pdf")
//         .addEventListener("click", () => {
//             const invoice = this.document.getElementById("invoice");
//             console.log(invoice);
//             console.log(window);
//             var opt = {
//                 margin: 1,
//                 filename: 'myfile.pdf',
//                 image: { type: 'jpeg', quality: 0.98 },
//                 html2canvas: { scale: 2 },
//                 jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
//             };
//             html2pdf().from(invoice).set(opt).save();
//         })
// }


document.querySelector("#backend").addEventListener("mouseover", function  frontend(){

    var n1 = document.querySelector(".fundo")
    
    n1.setAttribute('id','fundobackend')
    
    });


    document.querySelector("#frontend").addEventListener("mouseover", function  frontend(){

        var n2 = document.querySelector(".fundo")
        n2.setAttribute('id','fundofrontend')
        
        });
    
    
        document.querySelector(".card-img-top").addEventListener("mouseover", function  frontend(){

            var n2 = document.querySelector(".fundo")
            n2.setAttribute('id','')
            
            });
        
        