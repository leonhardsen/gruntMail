module.exports = function(grunt){

  grunt.initConfig({
    email: {
      dev: {
        options: {          
          config: '',
          structure: '',
          variables: '',
          files: '',
          contentTypes: ''           
        }
      }      
    }
  });

  grunt.registerTask('run', function(path){
    if(path){        
      grunt.task.run('searchJson:'+path);
    }else{
      grunt.log.writeln("Insira o caminho da pasta no formato YYYYMMDD/JOB/VERSION");
    }  
  });

  grunt.registerTask('searchJson', function(path){      
    var dir = "Smiles/"+path+"/";        
    if(grunt.file.exists(dir+'_src/email.json')){
      var emailJson = grunt.file.readJSON(dir+'_src/email.json');
      grunt.option('config', emailJson.config);
      grunt.option('structure', emailJson.structure);
      grunt.option('variables', emailJson.variables); 
      grunt.option('files', emailJson.files); 
      grunt.option('contentTypes', emailJson.contentTypes); 
      grunt.task.run('readJson:'+dir);
    }else{
      grunt.log.writeln("Arquivo email.json não encontrado");
    }          
  }); 

  grunt.registerTask('readJson', function(dir){
    var config = grunt.option('config'); 
    var structure = grunt.option('structure');    
    var variables = grunt.option('variables');
    var files = grunt.option('files');
    var contentTypes = grunt.option('contentTypes');

    var templates = grunt.file.readJSON('templates.json');

    // verifica se na pasta existe um arquivo para valores default
    if(grunt.file.exists(dir+'_src/default.json')){
      var defaultValues = grunt.file.readJSON(dir+'_src/default.json');
    }else{
      var defaultValues = 0;
    }

    var contents_static = [];
    var contents_dynamic = [];

    for(type in contentTypes){
      contents_static[type] = "";
      contents_dynamic[type] = "";
    }
    
    // itera nos blocos da estrutura
    for(var blocks in structure){           
      // verifica se existe algum template (templates.json) para aquele tipo de estrutura
      if(typeof templates[structure[blocks].type] != "undefined"){         
        // verifica se o tipo do bloco é html (blocos não padrão)
        if(templates[structure[blocks].type].templateFile == "html"){
          // caso sim, lê o arquivo na pasta "_src"
          var file_name = dir+'_src/'+structure[blocks].fileSrc+".html";
        }else{           
          // verifica se o parametro "version" foi preenchido no bloco
          if(typeof structure[blocks].version != "undefined"){
            // caso sim, o nome do arquivo terá o nome da versão
            var file_name = 'templates/block/'+templates[structure[blocks].type].templateFile+"_"+structure[blocks].version+".html";
          }else{
            // caso não, o nome do arquivo será o padrão (templates.json)
            var file_name = 'templates/block/'+templates[structure[blocks].type].templateFile+".html";
          }
        }     
        //le o conteúdo do template
        template_html = grunt.file.read(file_name);  
        template_dynamic = template_html;      
        // itera nos parametros do bloco
        for(var block_variable in structure[blocks]){
          //verifica se há parametros para ser substituidos
          while(template_html.search("{{ "+block_variable+" }}") != -1){
            //substitui todos os parametros encontrados no bloco e no template (match)          
            template_html = template_html.replace("{{ "+block_variable+" }}",structure[blocks][block_variable]);
            template_dynamic = template_dynamic.replace("{{ "+block_variable+" }}",structure[blocks][block_variable]);
          }                      
        }

        // verifica se foi lido um arquivo com valores default
        if(defaultValues != 0){
          // itera nos valores default setados do json
          for(var defaultValue in defaultValues){            
            //verifica se há parametros para ser substituidos
            while(template_html.search("{{ "+defaultValue+" }}") != -1){
              //substitui todos os parametros encontrados no bloco e no template (match)
              template_html = template_html.replace("{{ "+defaultValue+" }}",defaultValues[defaultValue].default);
              template_dynamic = template_dynamic.replace("{{ "+defaultValue+" }}",defaultValues[defaultValue].default);
            }
          }
        }

        //itera nas variaveis (email.json)
        for(var variable in variables){
          //verifica se há variaveis para ser substituidas
          while(template_html.search("{{ "+variable+" }}") != -1){
            //substitui todas as variaveis encontradas   
            template_dynamic = template_dynamic.replace("{{ "+variable+" }}",variables[variable].reference);
            template_html = template_html.replace("{{ "+variable+" }}",variables[variable].example);
          }          
        }
        //verifica se há alguma referencia a pastas de imagens
        while(template_html.search("{{ imageDir }}") != -1){
          //substitui todas as variaveis pelo caminho da pasta  
          template_dynamic = template_dynamic.replace("{{ imageDir }}",config.imageDir);
          template_html = template_html.replace("{{ imageDir }}",config.imageDir);
        } 

        //salva o arquivo temporario do bloco
        grunt.file.write(dir+'_tmp/'+blocks+'_'+structure[blocks].type+'.html', template_html);
        //verifica se o bloco é dinamico
        if(structure[blocks].is_dynamic == 's'){
          //se sim, le o conteudo do "dynamic_row" linha para adicionar a variavel no html
          dynamic_row = grunt.file.read('templates/block/dynamic_row.html');
          //verifica o formato de variavel
          varType = config.varType;
          //adiciona o nome do arquivo ao formato da variável
          varType = varType.replace("filename",(structure[blocks].filename).toUpperCase());
          //adiciona a variável no arquivo "dynamic_row"
          dynamic_row = dynamic_row.replace("{{ varType }}",varType);             
          //concatena o bloco html na variavel contents_dynamic
          contents_dynamic[structure[blocks].contentType] = contents_dynamic[structure[blocks].contentType] + dynamic_row;
          //carrega a base de slot
          var base_slot = grunt.file.read("templates/base/base_slot.html");
          //adiciona o conteudo do slot na base
          base_slot = base_slot.replace("{{ slot_content }}",template_dynamic); 
          //salva o arquivo do slot
          grunt.file.write(dir+'slots/'+structure[blocks].filename+'.html', base_slot);       
        }else{          
          //concatena o bloco html na variavel contents_dynamic
          contents_dynamic[structure[blocks].contentType] = contents_dynamic[structure[blocks].contentType] + template_dynamic;
        }        
        //concatena o bloco html na variavel contents_static
        contents_static[structure[blocks].contentType] = contents_static[structure[blocks].contentType] + template_html;
      }else{
        grunt.log.writeln("Template não encontrado");     
      }      
    }    
    //itera nos arquivos
    for(var file in files){
      //carrega a base determinada para cada arquivo
      var base = grunt.file.read("templates/base/"+files[file].base+".html");
      //verifica se o arquivo será criado a partir do conteudo estatico ou dinamico
      if(files[file].html == "static"){        
        //itera nos tipos de conteudo dentro de contents_static        
        for(content in contents_static){
          //subtitui a marcação na base pelo conteúdo determinado
          base = base.replace("{{ "+content+" }}",contents_static[content]);              
        }
      }else if(files[file].html == "dynamic"){
        //itera nos tipos de conteudo dentro de contents_dynamic
        for(content in contents_dynamic){
          //subtitui a marcação na base pelo conteúdo determinado
          base = base.replace("{{ "+content+" }}",contents_dynamic[content]); 
        }
      }
      //subtitui o snippet
      base = base.replace("{{ snippet }}",config.snippet);              
      //salva o arquivo
      grunt.file.write(dir+file+'.html', base);
    }
  }); 
}